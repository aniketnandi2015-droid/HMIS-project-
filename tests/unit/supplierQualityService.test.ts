import { describe, it, expect } from 'vitest';
import { SupplierQualityService } from '../../src/lib/domain/procurement/supplierQualityService';
import { SupplierQualityEvent } from '../../src/lib/types/pharmaassist';

describe('SupplierQualityService (FR-PROC-04)', () => {
  it('computes 100% score for on-time delivery with zero discrepancy or damage', () => {
    const events: SupplierQualityEvent[] = [
      {
        id: 'e1',
        purchaseOrderId: 'po1',
        supplierId: 's1',
        onTime: true,
        quantityDiscrepancy: 0,
        qualityFlag: 'none',
        evaluatedAt: '2026-09-01',
      },
    ];

    const result = SupplierQualityService.calculateSupplierScore(events);
    expect(result.score).toBe(100);
    expect(result.onTimeRate).toBe(100);
    expect(result.discrepancyCount).toBe(0);
    expect(result.qualityFlagCount).toBe(0);
  });

  it('penalizes late delivery, discrepancy, and damaged batch flags', () => {
    const events: SupplierQualityEvent[] = [
      {
        id: 'e1',
        purchaseOrderId: 'po1',
        supplierId: 's1',
        onTime: false, // -15
        quantityDiscrepancy: 5, // -10
        qualityFlag: 'damaged', // -25
        evaluatedAt: '2026-09-01',
      },
    ];

    const result = SupplierQualityService.calculateSupplierScore(events);
    // 100 - 15 - 10 - 25 = 50
    expect(result.score).toBe(50);
    expect(result.onTimeRate).toBe(0);
    expect(result.discrepancyCount).toBe(1);
    expect(result.qualityFlagCount).toBe(1);
  });
});
