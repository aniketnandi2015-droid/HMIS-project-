-- ==============================================================================
-- PharmaAssist Database Migration v1.0
-- Standards: SRS v2.1, SDD v0.1
-- Invariants: Single authoritative stock ledger, atomic dispatch,
--             safety separation, no payment processing, single operator.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Configuration (BR-01 to BR-06)
CREATE TABLE IF NOT EXISTS store_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    default_language TEXT NOT NULL DEFAULT 'en',
    reorder_threshold_default INTEGER NOT NULL DEFAULT 10,
    reorder_lead_time_days INTEGER NOT NULL DEFAULT 7,
    discount_reference_ceiling_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    near_expiry_days INTEGER NOT NULL DEFAULT 90,
    forecast_horizon_days INTEGER NOT NULL DEFAULT 7,
    forecast_min_data_days INTEGER NOT NULL DEFAULT 30,
    notification_channel TEXT NOT NULL DEFAULT 'SMS',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Drug Master (FR-POS-01, FR-INV-01, ASM-01)
CREATE TABLE IF NOT EXISTS drug_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    strength TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    schedule_category TEXT NOT NULL DEFAULT 'OTC', -- 'OTC', 'Prescription', 'Schedule H', etc.
    list_price NUMERIC(10,2) NOT NULL CHECK (list_price >= 0),
    dosage_direction TEXT,
    common_side_effects TEXT,
    identifiers TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drug_master_names ON drug_master (brand_name, generic_name);
CREATE INDEX IF NOT EXISTS idx_drug_master_active ON drug_master (active);

-- 3. Contraindication & Safety Reference (FR-POS-02, CON-04, NFR-SAFE-01)
CREATE TABLE IF NOT EXISTS contraindication_reference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1.0-ref',
    drug_key TEXT NOT NULL, -- Generic or brand key
    condition_key TEXT NOT NULL, -- e.g., 'Pregnancy', 'Hypertension', 'Pediatric < 12', etc.
    interaction_type TEXT NOT NULL DEFAULT 'Drug-Condition', -- 'Drug-Condition', 'Drug-Drug'
    severity TEXT NOT NULL DEFAULT 'High', -- 'High' (Blocking), 'Medium' (Warning)
    description TEXT NOT NULL,
    source_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_contraindication_lookup ON contraindication_reference (drug_key, condition_key);

-- 4. Suppliers (FR-PROC-02, FR-PROC-04)
CREATE TABLE IF NOT EXISTS supplier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    drugs_supplied TEXT[] DEFAULT '{}',
    promised_lead_time_days INTEGER NOT NULL DEFAULT 3,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Stock Batches & Authoritative Ledger (FR-INV-01, FR-INV-02, FR-INV-05)
CREATE TABLE IF NOT EXISTS stock_batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE RESTRICT,
    batch_number TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    received_from_supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    stock_version INTEGER NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_drug_batch UNIQUE (drug_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_batch_drug ON stock_batch (drug_id);
CREATE INDEX IF NOT EXISTS idx_stock_batch_expiry ON stock_batch (expiry_date);

-- 6. Stock Adjustments with Reason Code (FR-INV-04)
CREATE TABLE IF NOT EXISTS stock_adjustment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_batch_id UUID NOT NULL REFERENCES stock_batch(id) ON DELETE CASCADE,
    quantity_delta INTEGER NOT NULL,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('damage', 'expiry_write_off', 'physical_count_correction', 'other')),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'operator_manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Transactions & Logging (FR-TXN-01, FR-POS-06, CON-06 NO PAYMENT)
CREATE TABLE IF NOT EXISTS "transaction" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_value NUMERIC(10,2) NOT NULL CHECK (total_value >= 0),
    total_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_discount >= 0),
    visit_type TEXT NOT NULL DEFAULT 'OTC', -- 'OTC', 'Prescription'
    prescription_sighted BOOLEAN NOT NULL DEFAULT FALSE,
    discount_flag BOOLEAN NOT NULL DEFAULT FALSE, -- True if discount > reference ceiling (BR-02)
    quantity_correction_flag BOOLEAN NOT NULL DEFAULT FALSE,
    sync_status TEXT NOT NULL DEFAULT 'synced', -- 'pending', 'synced', 'conflict'
    device_id TEXT DEFAULT 'counter-1'
);

CREATE TABLE IF NOT EXISTS transaction_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES "transaction"(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE RESTRICT,
    stock_batch_id UUID NOT NULL REFERENCES stock_batch(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    extended_value NUMERIC(10,2) NOT NULL CHECK (extended_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transaction_timestamp ON "transaction" (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_item_tx ON transaction_item (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_item_drug ON transaction_item (drug_id);

-- 8. Unmet Demand Log (FR-POS-07)
CREATE TABLE IF NOT EXISTS unmet_demand (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requested_drug_text TEXT NOT NULL,
    normalized_drug_id UUID REFERENCES drug_master(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL CHECK (reason IN ('no_match', 'no_stock', 'no_substitute')),
    fulfilled BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. Purchase Orders & Receipts (FR-PROC-03)
CREATE TABLE IF NOT EXISTS purchase_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promised_lead_time_days INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'sent', 'confirmed', 'received', 'closed'))
);

CREATE TABLE IF NOT EXISTS purchase_order_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE RESTRICT,
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0)
);

-- 10. Supplier Quality Events (FR-PROC-04)
CREATE TABLE IF NOT EXISTS supplier_quality_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    on_time BOOLEAN NOT NULL,
    quantity_discrepancy INTEGER NOT NULL DEFAULT 0,
    quality_flag TEXT NOT NULL DEFAULT 'none' CHECK (quality_flag IN ('none', 'damaged', 'expired_on_arrival', 'rejected_batch')),
    notes TEXT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Cross-Sell Suggestions & Demand Forecasts (FR-ANL-02, FR-ANL-03)
CREATE TABLE IF NOT EXISTS cross_sell_suggestion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    suggested_drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    support_count INTEGER NOT NULL DEFAULT 1,
    rank INTEGER NOT NULL DEFAULT 1,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demand_forecast (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    horizon_days INTEGER NOT NULL DEFAULT 7,
    visit_type TEXT NOT NULL DEFAULT 'OTC',
    forecast_units NUMERIC(10,2) NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'v1-moving-avg',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eligible BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_reason TEXT
);

-- 12. Notification Events (FR-PROC-05)
CREATE TABLE IF NOT EXISTS notification_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed'))
);

-- 13. Sync Queue for Offline Synchronization (CON-02, NFR-DEG-01)
CREATE TABLE IF NOT EXISTS sync_queue_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    base_version INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'conflict', 'retry')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (RPC)
-- ==============================================================================

-- Atomic Dispatch Transaction (FR-POS-06)
-- Must execute within a single PostgreSQL transaction
CREATE OR REPLACE FUNCTION dispatch_transaction(
    p_visit_type TEXT,
    p_prescription_sighted BOOLEAN,
    p_items JSONB, -- Array of {drug_id, stock_batch_id, quantity, unit_price, discount, extended_value}
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
        extended_value NUMERIC(10,2)
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

        -- Insert Transaction Item
        INSERT INTO transaction_item (
            transaction_id,
            drug_id,
            stock_batch_id,
            quantity,
            unit_price,
            discount,
            extended_value
        ) VALUES (
            v_tx_id,
            v_item.drug_id,
            v_item.stock_batch_id,
            v_item.quantity,
            v_item.unit_price,
            v_item.discount,
            v_item.extended_value
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

-- Atomic Stock Adjustment (FR-INV-04)
CREATE OR REPLACE FUNCTION apply_stock_adjustment(
    p_stock_batch_id UUID,
    p_quantity_delta INTEGER,
    p_reason_code TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_qty INTEGER;
    v_adj_id UUID;
BEGIN
    -- Lock and update batch
    UPDATE stock_batch
    SET quantity_on_hand = quantity_on_hand + p_quantity_delta,
        stock_version = stock_version + 1,
        last_updated_at = NOW()
    WHERE id = p_stock_batch_id
    RETURNING quantity_on_hand INTO v_new_qty;

    IF v_new_qty IS NULL THEN
        RAISE EXCEPTION 'Stock batch % does not exist', p_stock_batch_id;
    END IF;

    IF v_new_qty < 0 THEN
        RAISE EXCEPTION 'Stock adjustment cannot result in negative quantity';
    END IF;

    -- Record adjustment audit
    INSERT INTO stock_adjustment (
        stock_batch_id,
        quantity_delta,
        reason_code,
        notes
    ) VALUES (
        p_stock_batch_id,
        p_quantity_delta,
        p_reason_code,
        p_notes
    ) RETURNING id INTO v_adj_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'adjustment_id', v_adj_id,
        'new_quantity_on_hand', v_new_qty
    );
END;
$$;

-- Atomic Purchase Order Receipt (FR-PROC-03, FR-PROC-04)
CREATE OR REPLACE FUNCTION receive_purchase_order(
    p_purchase_order_id UUID,
    p_receipt_items JSONB, -- Array of {drug_id, batch_number, lot_number, manufacturing_date, expiry_date, received_quantity}
    p_on_time BOOLEAN,
    p_quality_flag TEXT DEFAULT 'none',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po RECORD;
    v_item RECORD;
    v_supplier_id UUID;
    v_total_discrepancy INTEGER := 0;
    v_ordered_qty INTEGER;
BEGIN
    SELECT supplier_id INTO v_supplier_id FROM purchase_order WHERE id = p_purchase_order_id;
    IF v_supplier_id IS NULL THEN
        RAISE EXCEPTION 'Purchase order % not found', p_purchase_order_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_receipt_items) AS (
        drug_id UUID,
        batch_number TEXT,
        lot_number TEXT,
        manufacturing_date DATE,
        expiry_date DATE,
        received_quantity INTEGER
    )
    LOOP
        -- Get ordered quantity for line item
        SELECT ordered_quantity INTO v_ordered_qty
        FROM purchase_order_item
        WHERE purchase_order_id = p_purchase_order_id AND drug_id = v_item.drug_id;

        IF v_ordered_qty IS NOT NULL THEN
            UPDATE purchase_order_item
            SET received_quantity = v_item.received_quantity
            WHERE purchase_order_id = p_purchase_order_id AND drug_id = v_item.drug_id;

            v_total_discrepancy := v_total_discrepancy + (v_ordered_qty - v_item.received_quantity);
        END IF;

        -- Upsert stock batch
        INSERT INTO stock_batch (
            drug_id,
            batch_number,
            lot_number,
            manufacturing_date,
            expiry_date,
            quantity_on_hand,
            received_from_supplier_id
        ) VALUES (
            v_item.drug_id,
            v_item.batch_number,
            v_item.lot_number,
            v_item.manufacturing_date,
            v_item.expiry_date,
            v_item.received_quantity,
            v_supplier_id
        )
        ON CONFLICT (drug_id, batch_number) DO UPDATE
        SET quantity_on_hand = stock_batch.quantity_on_hand + EXCLUDED.quantity_on_hand,
            stock_version = stock_batch.stock_version + 1,
            last_updated_at = NOW();
    END LOOP;

    -- Update PO status
    UPDATE purchase_order SET status = 'received' WHERE id = p_purchase_order_id;

    -- Record quality event
    INSERT INTO supplier_quality_event (
        purchase_order_id,
        supplier_id,
        on_time,
        quantity_discrepancy,
        quality_flag,
        notes
    ) VALUES (
        p_purchase_order_id,
        v_supplier_id,
        p_on_time,
        v_total_discrepancy,
        p_quality_flag,
        p_notes
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'purchase_order_id', p_purchase_order_id,
        'discrepancy', v_total_discrepancy,
        'status', 'received'
    );
END;
$$;
