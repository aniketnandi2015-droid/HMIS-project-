import { describe, it, expect } from 'vitest';
import { NearExpiryService } from '../../src/lib/domain/inventory/nearExpiryService';
import { StockBatch } from '../../src/lib/types/pharmaassist';

describe('NearExpiryService (FR-INV-05, BR-03)', () => {
  const currentDate = new Date('2026-09-28T00:00:00.000Z');

  const createBatch = (expiryDate: string): StockBatch => ({
    id: 'test-batch',
    drugId: 'drug-1',
    batchNumber: 'B1',
    lotNumber: 'L1',
    manufacturingDate: '2025-01-01',
    expiryDate,
    quantityOnHand: 20,
    reorderThreshold: 10,
    stockVersion: 1,
    lastUpdatedAt: '',
  });

  it('identifies an expired batch correctly', () => {
    const expiredBatch = createBatch('2026-08-31');
    expect(NearExpiryService.isExpired(expiredBatch, currentDate)).toBe(true);
    expect(NearExpiryService.isNearExpiry(expiredBatch, 90, currentDate)).toBe(true);
  });

  it('identifies near expiry within 90 days', () => {
    // 33 days away
    const nearExpiryBatch = createBatch('2026-10-31');
    expect(NearExpiryService.isExpired(nearExpiryBatch, currentDate)).toBe(false);
    expect(NearExpiryService.isNearExpiry(nearExpiryBatch, 90, currentDate)).toBe(true);
    expect(NearExpiryService.getDaysToExpiry(nearExpiryBatch, currentDate)).toBe(33);
  });

  it('identifies safe batches with > 90 days shelf life', () => {
    // Over a year away
    const safeBatch = createBatch('2027-12-31');
    expect(NearExpiryService.isExpired(safeBatch, currentDate)).toBe(false);
    expect(NearExpiryService.isNearExpiry(safeBatch, 90, currentDate)).toBe(false);
  });
});
