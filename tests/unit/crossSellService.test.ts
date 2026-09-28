import { describe, it, expect } from 'vitest';
import { CrossSellService } from '../../src/lib/domain/analytics/crossSellService';
import { DrugMaster, StockBatch, Transaction } from '../../src/lib/types/pharmaassist';

describe('CrossSellService (FR-ANL-03)', () => {
  const paracetamol: DrugMaster = {
    id: 'd-para',
    brandName: 'Dolo 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 2,
    identifiers: [],
    active: true,
  };

  const cetirizine: DrugMaster = {
    id: 'd-cet',
    brandName: 'Cetcip 10mg',
    genericName: 'Cetirizine',
    strength: '10mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 4,
    identifiers: [],
    active: true,
  };

  const ors: DrugMaster = {
    id: 'd-ors',
    brandName: 'Electral',
    genericName: 'ORS',
    strength: '21.8g',
    dosageForm: 'Powder',
    scheduleCategory: 'OTC',
    listPrice: 20,
    identifiers: [],
    active: true,
  };

  const batches: StockBatch[] = [
    {
      id: 'b-para',
      drugId: 'd-para',
      batchNumber: 'BP1',
      lotNumber: 'L1',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31',
      quantityOnHand: 100,
      reorderThreshold: 10,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
    {
      id: 'b-cet',
      drugId: 'd-cet',
      batchNumber: 'BC1',
      lotNumber: 'L2',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31',
      quantityOnHand: 50,
      reorderThreshold: 10,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
    {
      id: 'b-ors',
      drugId: 'd-ors',
      batchNumber: 'BO1',
      lotNumber: 'L3',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31',
      quantityOnHand: 40,
      reorderThreshold: 10,
      stockVersion: 1,
      lastUpdatedAt: '',
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 't1',
      timestamp: '2026-09-20',
      totalValue: 6,
      totalDiscount: 0,
      visitType: 'OTC',
      prescriptionSighted: false,
      discountFlag: false,
      quantityCorrectionFlag: false,
      syncStatus: 'synced',
      items: [
        {
          id: 'i1',
          transactionId: 't1',
          drugId: 'd-para',
          stockBatchId: 'b-para',
          quantity: 1,
          unitPrice: 2,
          discount: 0,
          extendedValue: 2,
        },
        {
          id: 'i2',
          transactionId: 't1',
          drugId: 'd-cet',
          stockBatchId: 'b-cet',
          quantity: 1,
          unitPrice: 4,
          discount: 0,
          extendedValue: 4,
        },
      ],
    },
  ];

  it('suggests co-purchased item (Cetirizine) when Paracetamol is sold', () => {
    const suggestions = CrossSellService.getCrossSellSuggestions(
      'd-para',
      transactions,
      [paracetamol, cetirizine, ors],
      batches
    );

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].suggestedDrugId).toBe('d-cet');
    expect(suggestions[0].supportCount).toBe(1);
  });
});
