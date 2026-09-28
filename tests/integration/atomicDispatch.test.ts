import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../../src/lib/offline/storageAdapter';
import { Transaction, DrugMaster, StockBatch } from '../../src/lib/types/pharmaassist';

describe('Atomic Dispatch Invariant (FR-POS-06, FR-INV-01, CON-06)', () => {
  const testDrug: DrugMaster = {
    id: 'drug-test-1',
    brandName: 'Augmentin 625',
    genericName: 'Amoxicillin + Clavulanic Acid',
    strength: '625mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'Prescription',
    listPrice: 20.0,
    identifiers: [],
    active: true,
  };

  const initialBatch: StockBatch = {
    id: 'batch-test-1',
    drugId: 'drug-test-1',
    batchNumber: 'AUG-B101',
    lotNumber: 'LOT-99',
    manufacturingDate: '2026-01-01',
    expiryDate: '2027-12-31',
    quantityOnHand: 50,
    reorderThreshold: 10,
    stockVersion: 1,
    lastUpdatedAt: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset local store
    LocalStorageAdapter.saveDrugs([testDrug]);
    LocalStorageAdapter.saveBatches([{ ...initialBatch }]);
    LocalStorageAdapter.saveTransactions([]);
  });

  it('atomically decrements stock and logs transaction upon valid dispatch', () => {
    const tx: Transaction = {
      id: 'TX-INT-001',
      timestamp: new Date().toISOString(),
      totalValue: 60.0,
      totalDiscount: 0,
      visitType: 'Prescription',
      prescriptionSighted: true,
      discountFlag: false,
      quantityCorrectionFlag: false,
      syncStatus: 'synced',
      items: [
        {
          id: 'item-1',
          transactionId: 'TX-INT-001',
          drugId: 'drug-test-1',
          stockBatchId: 'batch-test-1',
          quantity: 3,
          unitPrice: 20.0,
          discount: 0,
          extendedValue: 60.0,
          drugName: 'Augmentin 625',
          batchNumber: 'AUG-B101',
        },
      ],
    };

    const result = LocalStorageAdapter.atomicLocalDispatch(tx);
    expect(result.success).toBe(true);

    // Verify stock is decremented by exactly 3: 50 - 3 = 47
    const batches = LocalStorageAdapter.getBatches();
    const updatedBatch = batches.find((b) => b.id === 'batch-test-1');
    expect(updatedBatch?.quantityOnHand).toBe(47);
    expect(updatedBatch?.stockVersion).toBe(2);

    // Verify transaction was logged
    const txs = LocalStorageAdapter.getTransactions();
    expect(txs.length).toBe(1);
    expect(txs[0].id).toBe('TX-INT-001');
    expect(txs[0].totalValue).toBe(60.0);
  });

  it('fails atomically and preserves stock if requested quantity exceeds available quantity', () => {
    const invalidTx: Transaction = {
      id: 'TX-INT-002',
      timestamp: new Date().toISOString(),
      totalValue: 2000.0,
      totalDiscount: 0,
      visitType: 'Prescription',
      prescriptionSighted: true,
      discountFlag: false,
      quantityCorrectionFlag: false,
      syncStatus: 'synced',
      items: [
        {
          id: 'item-2',
          transactionId: 'TX-INT-002',
          drugId: 'drug-test-1',
          stockBatchId: 'batch-test-1',
          quantity: 100, // Available is only 50!
          unitPrice: 20.0,
          discount: 0,
          extendedValue: 2000.0,
          drugName: 'Augmentin 625',
          batchNumber: 'AUG-B101',
        },
      ],
    };

    const result = LocalStorageAdapter.atomicLocalDispatch(invalidTx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');

    // Verify stock unchanged
    const batches = LocalStorageAdapter.getBatches();
    const batch = batches.find((b) => b.id === 'batch-test-1');
    expect(batch?.quantityOnHand).toBe(50);

    // Verify no transaction logged
    const txs = LocalStorageAdapter.getTransactions();
    expect(txs.length).toBe(0);
  });
});
