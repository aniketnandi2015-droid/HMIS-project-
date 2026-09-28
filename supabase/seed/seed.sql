-- ==============================================================================
-- PharmaAssist Seed Data
-- ==============================================================================

-- 1. Store Config
INSERT INTO store_configuration (default_language, reorder_threshold_default, discount_reference_ceiling_percent, near_expiry_days)
VALUES ('en', 15, 5.00, 90)
ON CONFLICT DO NOTHING;

-- 2. Suppliers
INSERT INTO supplier (id, name, contact_phone, contact_email, drugs_supplied, promised_lead_time_days)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Apex Pharma Distributors', '+91 98765 43210', 'orders@apexpharma.com', ARRAY['Amoxicillin', 'Azithromycin', 'Ciprofloxacin'], 2),
    ('22222222-2222-2222-2222-222222222222', 'Zenith Healthcare Logistics', '+91 98765 43211', 'dispatch@zenithmed.com', ARRAY['Paracetamol', 'Ibuprofen', 'Cetirizine'], 3),
    ('33333333-3333-3333-3333-333333333333', 'MedLife Prime Wholesale', '+91 98765 43212', 'support@medlifeprime.com', ARRAY['Metformin', 'Atorvastatin', 'Amlodipine'], 1)
ON CONFLICT DO NOTHING;

-- 3. Drug Master
INSERT INTO drug_master (id, brand_name, generic_name, strength, dosage_form, schedule_category, list_price, dosage_direction, common_side_effects, identifiers)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Augmentin 625 Duo', 'Amoxicillin + Clavulanic Acid', '500mg+125mg', 'Tablet', 'Prescription', 22.50, 'Take 1 tablet twice daily with meals for 5 days', 'Mild diarrhea, nausea, skin rash', ARRAY['890123456001', 'AUG625']),
    ('a0000000-0000-0000-0000-000000000002', 'Moxikind-CV 625', 'Amoxicillin + Clavulanic Acid', '500mg+125mg', 'Tablet', 'Prescription', 18.00, 'Take 1 tablet twice daily with meals for 5 days', 'Mild diarrhea, nausea, headache', ARRAY['890123456002', 'MOX625']),
    ('a0000000-0000-0000-0000-000000000003', 'Calpol 650', 'Paracetamol', '650mg', 'Tablet', 'OTC', 2.10, 'Take 1 tablet every 4 to 6 hours as needed for fever/pain (max 4g/day)', 'Rare: liver toxicity in overdose', ARRAY['890123456003', 'CAL650']),
    ('a0000000-0000-0000-0000-000000000004', 'Dolo 650', 'Paracetamol', '650mg', 'Tablet', 'OTC', 2.15, 'Take 1 tablet every 4 to 6 hours as needed for fever/pain', 'Rare: rash, nausea', ARRAY['890123456004', 'DOLO650']),
    ('a0000000-0000-0000-0000-000000000005', 'Crocin 650 Advance', 'Paracetamol', '650mg', 'Tablet', 'OTC', 2.20, 'Take 1 tablet every 4 to 6 hours as needed', 'Rare: rash', ARRAY['890123456005', 'CRO650']),
    ('a0000000-0000-0000-0000-000000000006', 'Lipitor 20mg', 'Atorvastatin', '20mg', 'Tablet', 'Prescription', 14.50, 'Take 1 tablet daily at bedtime', 'Muscle ache, elevated liver enzymes, digestive distress', ARRAY['890123456006', 'LIP20']),
    ('a0000000-0000-0000-0000-000000000007', 'Atorva 20mg', 'Atorvastatin', '20mg', 'Tablet', 'Prescription', 11.20, 'Take 1 tablet daily at bedtime', 'Muscle ache, fatigue', ARRAY['890123456007', 'ATOR20']),
    ('a0000000-0000-0000-0000-000000000008', 'Glycomet 500 SR', 'Metformin Hydrochloride', '500mg', 'Tablet', 'Prescription', 3.80, 'Take 1 tablet with or after evening meal', 'Gastrointestinal upset, metallic taste, nausea', ARRAY['890123456008', 'GLY500']),
    ('a0000000-0000-0000-0000-000000000009', 'Cetcip 10mg', 'Cetirizine Hydrochloride', '10mg', 'Tablet', 'OTC', 4.50, 'Take 1 tablet once daily in the evening', 'Mild drowsiness, dry mouth, headache', ARRAY['890123456009', 'CET10']),
    ('a0000000-0000-0000-0000-000000000010', 'Electral ORS 21.8g', 'Oral Rehydration Salts', '21.8g Sachet', 'Powder', 'OTC', 22.00, 'Dissolve contents in 1 liter of clean drinking water', 'None known when taken as directed', ARRAY['890123456010', 'ORS21'])
ON CONFLICT DO NOTHING;

-- 4. Contraindication & Safety Reference
INSERT INTO contraindication_reference (reference_id, version, drug_key, condition_key, interaction_type, severity, description)
VALUES
    ('REF-001', 'v1.0-ref', 'Amoxicillin + Clavulanic Acid', 'Penicillin Allergy', 'Drug-Allergy', 'High', 'Patient has severe anaphylactic risk to beta-lactam antibiotics. DO NOT DISPENSE.'),
    ('REF-002', 'v1.0-ref', 'Paracetamol', 'Chronic Liver Disease', 'Drug-Condition', 'High', 'Severe hepatic impairment. Daily Paracetamol dose exceeds toxic threshold.'),
    ('REF-003', 'v1.0-ref', 'Atorvastatin', 'Active Liver Failure', 'Drug-Condition', 'High', 'Statins contraindicated in active liver disease or unexplained transaminase elevations.'),
    ('REF-004', 'v1.0-ref', 'Metformin Hydrochloride', 'Severe Renal Impairment', 'Drug-Condition', 'High', 'Risk of lactic acidosis when eGFR < 30 mL/min.'),
    ('REF-005', 'v1.0-ref', 'Cetirizine Hydrochloride', 'Severe Sedation Risk', 'Drug-Condition', 'Medium', 'Caution with concurrent CNS depressants or machinery operation.')
ON CONFLICT DO NOTHING;

-- 5. Stock Batches
INSERT INTO stock_batch (id, drug_id, batch_number, lot_number, manufacturing_date, expiry_date, quantity_on_hand, reorder_threshold, received_from_supplier_id)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'AUG-B2026-01', 'LOT-9821', '2025-10-01', '2027-09-30', 45, 15, '11111111-1111-1111-1111-111111111111'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'MOX-B2026-04', 'LOT-4412', '2026-01-10', '2027-12-31', 80, 20, '11111111-1111-1111-1111-111111111111'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'CAL-B2025-11', 'LOT-1102', '2025-06-15', '2026-10-31', 12, 30, '22222222-2222-2222-2222-222222222222'), -- Near expiry & low stock!
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'DOLO-B2026-02', 'LOT-7829', '2026-02-01', '2028-01-31', 250, 50, '22222222-2222-2222-2222-222222222222'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'CRO-B2026-09', 'LOT-5511', '2026-03-01', '2028-02-28', 140, 40, '22222222-2222-2222-2222-222222222222'),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'LIP-B2026-03', 'LOT-3320', '2025-12-01', '2027-11-30', 35, 20, '33333333-3333-3333-3333-333333333333'),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'ATOR-B2026-01', 'LOT-6710', '2026-01-15', '2027-12-31', 95, 25, '33333333-3333-3333-3333-333333333333'),
    ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'GLY-B2025-08', 'LOT-9012', '2025-08-01', '2027-07-31', 120, 30, '33333333-3333-3333-3333-333333333333'),
    ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'CET-B2026-05', 'LOT-8812', '2026-04-01', '2028-03-31', 60, 25, '22222222-2222-2222-2222-222222222222'),
    ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'ORS-B2026-02', 'LOT-2190', '2026-02-15', '2028-02-14', 180, 50, '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- 6. Co-occurrence / Cross-sell Suggestions
INSERT INTO cross_sell_suggestion (source_drug_id, suggested_drug_id, support_count, rank)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 42, 1), -- Augmentin + ORS (for hydration)
    ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 38, 1), -- Paracetamol + Cetirizine (fever + cold)
    ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000009', 51, 1), -- Dolo 650 + Cetirizine
    ('a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000006', 29, 1)  -- Metformin + Lipitor (metabolic co-care)
ON CONFLICT DO NOTHING;
