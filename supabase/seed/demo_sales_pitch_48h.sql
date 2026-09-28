-- ==============================================================================
-- PharmaAssist 48-Hour Sales Pitch & Executive Demonstration Dataset
-- Target Period: September 27, 2026 - September 28, 2026
-- Demonstrates: POS Multi-item Carts, Clinical Safety Alerts, Authoritative Stock
--               Ledger, Controlled Discrepancy Audits, and Procurement Radar.
-- ==============================================================================

-- 1. Recent Transactions (September 27 & 28, 2026)
INSERT INTO "transaction" (
    id, timestamp, total_value, total_discount, visit_type,
    prescription_sighted, discount_flag, quantity_correction_flag, sync_status
) VALUES
-- Sept 28 Evening Peak & Loyalty Discounts
('e8000000-0000-0000-0000-000000000001', '2026-09-28T18:45:00Z', 710.00, 35.50, 'Prescription', TRUE, TRUE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000002', '2026-09-28T17:30:00Z', 129.00, 0.00, 'OTC', FALSE, FALSE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000003', '2026-09-28T15:10:00Z', 290.00, 10.00, 'Prescription', TRUE, TRUE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000004', '2026-09-28T13:20:00Z', 96.00, 0.00, 'Prescription', TRUE, FALSE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000005', '2026-09-28T11:45:00Z', 405.00, 0.00, 'Prescription', TRUE, FALSE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000006', '2026-09-28T10:15:00Z', 97.50, 0.00, 'OTC', FALSE, FALSE, FALSE, 'synced'),
('e8000000-0000-0000-0000-000000000007', '2026-09-28T09:10:00Z', 350.00, 15.00, 'Prescription', TRUE, TRUE, FALSE, 'synced'),

-- Sept 27 Clinical Interventions & Fast Movement
('e7000000-0000-0000-0000-000000000001', '2026-09-27T19:40:00Z', 555.00, 20.00, 'Prescription', TRUE, TRUE, FALSE, 'synced'),
('e7000000-0000-0000-0000-000000000002', '2026-09-27T18:15:00Z', 62.00, 0.00, 'OTC', FALSE, FALSE, FALSE, 'synced'),
('e7000000-0000-0000-0000-000000000003', '2026-09-27T16:30:00Z', 405.00, 0.00, 'Prescription', TRUE, FALSE, FALSE, 'synced'),
('e7000000-0000-0000-0000-000000000004', '2026-09-27T14:20:00Z', 147.00, 0.00, 'OTC', FALSE, FALSE, FALSE, 'synced'),
('e7000000-0000-0000-0000-000000000005', '2026-09-27T11:10:00Z', 175.00, 0.00, 'Prescription', TRUE, FALSE, FALSE, 'synced'),
('e7000000-0000-0000-0000-000000000006', '2026-09-27T09:30:00Z', 68.00, 0.00, 'OTC', FALSE, FALSE, FALSE, 'synced')
ON CONFLICT (id) DO NOTHING;

-- 2. Transaction Line Items
INSERT INTO transaction_item (
    id, transaction_id, drug_id, stock_batch_id,
    quantity, unit_price, discount, extended_value
) VALUES
-- Sept 28 items
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 202.50, 20.25, 384.75),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 2, 185.00, 15.25, 354.75),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 2, 32.50, 0.00, 65.00),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', 2, 22.00, 0.00, 44.00),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 1, 24.50, 0.00, 24.50),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', 2, 145.00, 10.00, 280.00),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 2, 48.00, 0.00, 96.00),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 202.50, 0.00, 405.00),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 3, 32.50, 0.00, 97.50),
(uuid_generate_v4(), 'e8000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 2, 175.00, 15.00, 335.00),

-- Sept 27 items
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 2, 185.00, 10.00, 360.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 4, 48.00, 10.00, 182.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 2, 31.00, 0.00, 62.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2, 202.50, 0.00, 405.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 2, 32.50, 0.00, 65.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 3, 24.50, 0.00, 73.50),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, 175.00, 0.00, 175.00),
(uuid_generate_v4(), 'e7000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 2, 34.00, 0.00, 68.00)
ON CONFLICT DO NOTHING;

-- 3. Controlled Physical Count Stock Discrepancies
INSERT INTO stock_adjustment (
    id, stock_batch_id, quantity_delta, reason_code, notes, source, created_at
) VALUES
('d8000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', -2, 'physical_count_correction', 'Loose blister cut variance during morning rush counter dispensing.', 'operator_manual', '2026-09-28T14:15:00Z'),
('d8000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', -3, 'damage', 'Torn packaging discovered on shelf rack; written off safely.', 'operator_manual', '2026-09-28T11:00:00Z'),
('d7000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'other', 'Invoice delivery quantity had 1 extra sample strip verified on physical rack.', 'operator_manual', '2026-09-27T16:45:00Z'),
('d7000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', -4, 'other', 'Physical count audit reconciliation logged; drawer shelf count adjusted.', 'operator_manual', '2026-09-27T12:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- 4. Unmet Customer Demand Signals
INSERT INTO unmet_demand (
    id, requested_drug_text, normalized_drug_id, reason, fulfilled, created_at
) VALUES
(uuid_generate_v4(), 'Montelukast 10mg + Levocetirizine', NULL, 'no_stock', FALSE, '2026-09-28T17:10:00Z'),
(uuid_generate_v4(), 'Azithromycin 500mg (Azee 500)', NULL, 'no_match', FALSE, '2026-09-28T11:35:00Z'),
(uuid_generate_v4(), 'Zincovit Effervescent Tablets', NULL, 'no_stock', FALSE, '2026-09-27T15:20:00Z')
ON CONFLICT DO NOTHING;

-- 5. Purchase Orders & Quality Audits
INSERT INTO purchase_order (
    id, supplier_id, status, promised_lead_time_days, created_at
) VALUES
('b1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'sent', 2, '2026-09-28T09:00:00Z'),
('b2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'received', 1, '2026-09-27T08:30:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order_item (
    id, purchase_order_id, drug_id, ordered_quantity, received_quantity
) VALUES
(uuid_generate_v4(), 'b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 50, 0),
(uuid_generate_v4(), 'b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 100, 0),
(uuid_generate_v4(), 'b2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 100, 100)
ON CONFLICT DO NOTHING;

INSERT INTO supplier_quality_event (
    id, purchase_order_id, supplier_id, on_time, quantity_discrepancy, quality_flag, notes, evaluated_at
) VALUES
(uuid_generate_v4(), 'b2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', TRUE, 0, 'none', 'Prompt morning arrival with cold-chain packaging verified.', '2026-09-28T08:45:00Z')
ON CONFLICT DO NOTHING;
