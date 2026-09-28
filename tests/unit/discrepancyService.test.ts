import { describe, it, expect } from 'vitest';
import { DiscrepancyService } from '../../src/lib/domain/inventory/discrepancyService';

describe('DiscrepancyService (Controlled Physical-Count Reconciliation & Audit Logging)', () => {
  it('correctly detects zero discrepancy when system and physical counts agree', () => {
    const res = DiscrepancyService.calculateDiscrepancy(25, 25);
    expect(res.delta).toBe(0);
    expect(res.percent).toBe(0);
    expect(res.direction).toBe('none');
    expect(res.severity).toBe('none');
    expect(res.isNoteRequired).toBe(false);
    expect(res.validationError).toBeUndefined();
  });

  it('classifies minor shortage when discrepancy is <= 5%', () => {
    // 100 -> 97: delta = -3, percent = 3%
    const res = DiscrepancyService.calculateDiscrepancy(100, 97);
    expect(res.delta).toBe(-3);
    expect(res.percent).toBe(3.0);
    expect(res.direction).toBe('shortage');
    expect(res.severity).toBe('minor');
    expect(res.isNoteRequired).toBe(false);
  });

  it('classifies material excess when discrepancy is between 5% and 10%', () => {
    // 50 -> 54: delta = +4, percent = 8%
    const res = DiscrepancyService.calculateDiscrepancy(50, 54);
    expect(res.delta).toBe(4);
    expect(res.percent).toBe(8.0);
    expect(res.direction).toBe('excess');
    expect(res.severity).toBe('material');
  });

  it('classifies significant discrepancy (>10%) and enforces mandatory explanatory note', () => {
    // 20 -> 16: delta = -4, percent = 20%
    const withoutNote = DiscrepancyService.calculateDiscrepancy(20, 16, 'physical_count_correction', '');
    expect(withoutNote.delta).toBe(-4);
    expect(withoutNote.percent).toBe(20.0);
    expect(withoutNote.severity).toBe('significant');
    expect(withoutNote.isNoteRequired).toBe(true);
    expect(withoutNote.validationError).toBeDefined();
    expect(withoutNote.validationError).toContain('mandatory explanatory note is required');

    // With valid note
    const withNote = DiscrepancyService.calculateDiscrepancy(
      20,
      16,
      'physical_count_correction',
      'Water leakage on shelf destroyed 4 blister strips'
    );
    expect(withNote.validationError).toBeUndefined();
  });

  it('enforces mandatory note when reason code is "other" regardless of severity', () => {
    const res = DiscrepancyService.calculateDiscrepancy(100, 99, 'other', '');
    expect(res.isNoteRequired).toBe(true);
    expect(res.validationError).toContain('mandatory note is required when selecting reason "Other"');
  });

  it('maps discrepancy reason codes to authoritative StockAdjustmentReason', () => {
    expect(DiscrepancyService.mapToStockAdjustmentReason('physical_count_correction')).toBe('physical_count_correction');
    expect(DiscrepancyService.mapToStockAdjustmentReason('damage_breakage')).toBe('damage');
    expect(DiscrepancyService.mapToStockAdjustmentReason('expired_stock')).toBe('expiry_write_off');
    expect(DiscrepancyService.mapToStockAdjustmentReason('receiving_discrepancy')).toBe('other');
  });

  it('creates an authoritative discrepancy audit record with full metadata', () => {
    const creation = DiscrepancyService.createRecord(
      'drug-1',
      'Dolo 650',
      'batch-1',
      'DOLO-B1',
      20,
      17,
      'damage_breakage',
      'Damaged blister package during unpacking'
    );

    expect(creation.success).toBe(true);
    expect(creation.record).toBeDefined();
    expect(creation.record?.discrepancyDelta).toBe(-3);
    expect(creation.record?.discrepancyPercent).toBe(15.0);
    expect(creation.record?.severity).toBe('significant');
    expect(creation.record?.reconciled).toBe(true);
  });
});
