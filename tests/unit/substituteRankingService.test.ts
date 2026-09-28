import { describe, it, expect } from 'vitest';
import { SubstituteRankingService } from '../../src/lib/domain/pos/substituteRankingService';
import { DrugMaster, StockBatch } from '../../src/lib/types/pharmaassist';

describe('SubstituteRankingService (FR-POS-04, FR-INV-05)', () => {
  const targetDrug: DrugMaster = {
    id: 'd-target',
    brandName: 'Calpol 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 2.1,
    identifiers: [],
    active: true,
  };

  const substituteA: DrugMaster = {
    id: 'd-sub-a',
    brandName: 'Dolo 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 2.15,
    identifiers: [],
    active: true,
  };

  const substituteB: DrugMaster = {
    id: 'd-sub-b',
    brandName: 'Crocin 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 2.2,
    identifiers: [],
    active: true,
  };

  const differentDrug: DrugMaster = {
    id: 'd-diff',
    brandName: 'Lipitor 20mg',
    genericName: 'Atorvastatin',
    strength: '20mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'Prescription',
    listPrice: 15.0,
    identifiers: [],
    active: true,
  };

  const currentDate = new Date('2026-09-28T00:00:00.000Z');

  const batches: StockBatch[] = [
    {
      id: 'b1',
      drugId: 'd-sub-a',
      batchNumber: 'B-DOLO-01',
      lotNumber: 'L1',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31', // Valid, stock = 100
      quantityOnHand: 100,
      reorderThreshold: 20,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
    {
      id: 'b2',
      drugId: 'd-sub-b',
      batchNumber: 'B-CROC-EXPIRED',
      lotNumber: 'L2',
      manufacturingDate: '2024-01-01',
      expiryDate: '2026-08-31', // EXPIRED! Must be excluded
      quantityOnHand: 50,
      reorderThreshold: 10,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
    {
      id: 'b3',
      drugId: 'd-diff',
      batchNumber: 'B-LIP-01',
      lotNumber: 'L3',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31',
      quantityOnHand: 200,
      reorderThreshold: 10,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
  ];

  it('ranks valid same-generic substitute and strictly excludes expired batches', () => {
    const substitutes = SubstituteRankingService.findSubstitutes(
      targetDrug,
      [targetDrug, substituteA, substituteB, differentDrug],
      batches,
      currentDate
    );

    expect(substitutes.length).toBe(1);
    expect(substitutes[0].drug.id).toBe('d-sub-a');
    expect(substitutes[0].drug.brandName).toBe('Dolo 650');
    expect(substitutes[0].availableQuantity).toBe(100);
    // substituteB (Crocin) has expired batch b2 so it must NOT appear
    expect(substitutes.some((s) => s.drug.id === 'd-sub-b')).toBe(false);
    // differentDrug (Atorvastatin) has different generic so it must NOT appear
    expect(substitutes.some((s) => s.drug.id === 'd-diff')).toBe(false);
  });
});
