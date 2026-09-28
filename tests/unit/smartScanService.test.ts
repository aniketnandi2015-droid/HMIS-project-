import { describe, it, expect } from 'vitest';
import { SmartScanService } from '../../src/lib/domain/ocr/smartScanService';
import { initialDrugs, initialBatches } from '../../src/lib/data/initialData';

describe('SmartScanService (Smart OCR Package Scanner & Catalog Matching)', () => {
  const sampleOcrText = `
    AUGMENTIN 625 DUO
    Amoxicillin and Potassium Clavulanate Tablets IP
    Strength: 500mg+125mg
    B.No: AUG-B2026-01
    MFG: 10/25  EXP: 09/27
    MRP Rs. 202.50
    890123456001
  `;

  it('correctly parses raw packaging OCR text into structured fields', () => {
    const parsed = SmartScanService.parsePackagingText(sampleOcrText);

    expect(parsed.rawText).toBe(sampleOcrText);
    expect(parsed.batchNumber).toBe('AUG-B2026-01');
    expect(parsed.expiryDate).toBe('2027-09-30');
    expect(parsed.manufacturingDate).toBe('2025-10-01');
    expect(parsed.strength).toBe('500mg+125mg');
    expect(parsed.dosageForm).toBe('Tablet');
    expect(parsed.barcodeNumber).toBe('890123456001');
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('matches parsed packaging to DrugMaster and StockBatch with high confidence', () => {
    const parsed = SmartScanService.parsePackagingText(sampleOcrText);
    const match = SmartScanService.matchToDrugMaster(parsed, initialDrugs, initialBatches);

    expect(match.matchedDrug).toBeDefined();
    expect(match.matchedDrug?.brandName).toBe('Augmentin 625 Duo');
    expect(match.matchedBatch).toBeDefined();
    expect(match.matchedBatch?.batchNumber).toBe('AUG-B2026-01');
    expect(match.matchScore).toBeGreaterThanOrEqual(80);
    expect(match.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('detects near-expiry batch and attaches expiry warning', () => {
    const nearExpirySample = `
      CALPOL 650
      Paracetamol Tablets IP 650mg
      B.No. CAL-B2025-11
      MFG: 06/25 EXP: 10/26
      GSK Pharmaceuticals
      890123456003
    `;

    const parsed = SmartScanService.parsePackagingText(nearExpirySample);
    const match = SmartScanService.matchToDrugMaster(parsed, initialDrugs, initialBatches);

    expect(match.matchedDrug?.brandName).toBe('Calpol 650');
    expect(match.matchedBatch?.batchNumber).toBe('CAL-B2025-11');
    expect(match.expiryWarning).toBeDefined();
    expect(match.expiryWarning).toContain('near expiry');
  });

  it('handles unknown package without breaking and returns candidate with low confidence', () => {
    const unknownSample = `
      UNREGISTERED NOVEL COMPOUND 999
      RandomChemical 100mg
      B.No: UNK-999
      EXP: 12/30
    `;

    const parsed = SmartScanService.parsePackagingText(unknownSample);
    const match = SmartScanService.matchToDrugMaster(parsed, initialDrugs, initialBatches);

    expect(match.matchedDrug).toBeUndefined();
    expect(match.matchedBatch).toBeUndefined();
    expect(match.matchScore).toBeLessThan(50);
  });
});
