-- ==============================================================================
-- PharmaAssist Migration v1.1: Smart Scan, Time-Series Forecasting & Indication Analytics
-- Standards: SRS v2.1 Controlled Extensions, SDD v0.1
-- ==============================================================================

-- 1. Add indication/demand category to drug_master
ALTER TABLE drug_master
ADD COLUMN IF NOT EXISTS indication_category TEXT DEFAULT 'General Health';

CREATE INDEX IF NOT EXISTS idx_drug_master_indication ON drug_master (indication_category);

-- 2. Add indication_category to transaction_item
ALTER TABLE transaction_item
ADD COLUMN IF NOT EXISTS indication_category TEXT DEFAULT 'General Health';

CREATE INDEX IF NOT EXISTS idx_transaction_item_indication ON transaction_item (indication_category);

-- 3. Extend demand_forecast with time-series model metadata
ALTER TABLE demand_forecast
ADD COLUMN IF NOT EXISTS indication_category TEXT DEFAULT 'All',
ADD COLUMN IF NOT EXISTS training_data_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mape_error NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS trend_direction TEXT DEFAULT 'stable';

-- 4. Cross-sell Recommendation Events (for attach rate & model evaluation)
CREATE TABLE IF NOT EXISTS cross_sell_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    suggested_drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    visit_type TEXT NOT NULL DEFAULT 'OTC',
    indication_category TEXT DEFAULT 'General Health',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_sell_event_pair ON cross_sell_event (source_drug_id, suggested_drug_id);

-- 5. Update atomic dispatch RPC to record indication category per item
CREATE OR REPLACE FUNCTION dispatch_transaction_v2(
    p_visit_type TEXT,
    p_prescription_sighted BOOLEAN,
    p_items JSONB, -- Array of {drug_id, stock_batch_id, quantity, unit_price, discount, extended_value, indication_category}
    p_discount_flag BOOLEAN DEFAULT FALSE,
    p_quantity_correction_flag BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_value NUMERIC(10,2) := 0;
    v_total_discount NUMERIC(10,2) := 0;
    v_tx_id UUID;
    v_item RECORD;
    v_batch_qty INTEGER;
    v_drug_schedule TEXT;
BEGIN
    -- 1. Create Transaction header
    INSERT INTO "transaction" (
        visit_type,
        prescription_sighted,
        total_value,
        total_discount,
        discount_flag,
        quantity_correction_flag,
        sync_status
    ) VALUES (
        p_visit_type,
        p_prescription_sighted,
        0, 0,
        p_discount_flag,
        p_quantity_correction_flag,
        'synced'
    ) RETURNING id INTO v_tx_id;

    -- 2. Process each item atomically
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        drug_id UUID,
        stock_batch_id UUID,
        quantity INTEGER,
        unit_price NUMERIC(10,2),
        discount NUMERIC(10,2),
        extended_value NUMERIC(10,2),
        indication_category TEXT
    )
    LOOP
        -- Check prescription requirement if drug is prescription category
        SELECT schedule_category INTO v_drug_schedule FROM drug_master WHERE id = v_item.drug_id;
        IF v_drug_schedule IN ('Prescription', 'Schedule H', 'Schedule X') AND NOT p_prescription_sighted THEN
            RAISE EXCEPTION 'Prescription sighting required for drug %', v_item.drug_id;
        END IF;

        -- Verify and decrement stock atomically (FOR UPDATE lock)
        SELECT quantity_on_hand INTO v_batch_qty
        FROM stock_batch
        WHERE id = v_item.stock_batch_id
        FOR UPDATE;

        IF v_batch_qty IS NULL THEN
            RAISE EXCEPTION 'Stock batch % does not exist', v_item.stock_batch_id;
        END IF;

        IF v_batch_qty < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %',
                v_item.stock_batch_id, v_batch_qty, v_item.quantity;
        END IF;

        -- Authoritative ledger decrement
        UPDATE stock_batch
        SET quantity_on_hand = quantity_on_hand - v_item.quantity,
            stock_version = stock_version + 1,
            last_updated_at = NOW()
        WHERE id = v_item.stock_batch_id;

        -- Insert Transaction Item with indication category
        INSERT INTO transaction_item (
            transaction_id,
            drug_id,
            stock_batch_id,
            quantity,
            unit_price,
            discount,
            extended_value,
            indication_category
        ) VALUES (
            v_tx_id,
            v_item.drug_id,
            v_item.stock_batch_id,
            v_item.quantity,
            v_item.unit_price,
            v_item.discount,
            v_item.extended_value,
            COALESCE(v_item.indication_category, 'General Health')
        );

        v_total_value := v_total_value + v_item.extended_value;
        v_total_discount := v_total_discount + v_item.discount;
    END LOOP;

    -- 3. Update Transaction totals
    UPDATE "transaction"
    SET total_value = v_total_value,
        total_discount = v_total_discount
    WHERE id = v_tx_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'transaction_id', v_tx_id,
        'total_value', v_total_value,
        'total_discount', v_total_discount,
        'timestamp', NOW()
    );
END;
$$;
