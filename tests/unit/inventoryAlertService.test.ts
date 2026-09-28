import { describe, it, expect } from 'vitest';
import { InventoryAlertService } from '../../src/lib/domain/inventory/inventoryAlertService';
import { initialDrugs, initialBatches } from '../../src/lib/data/initialData';
import { StockBatch } from '../../src/lib/types/pharmaassist';

describe('InventoryAlertService (Actionable Alerts & Deep Linking)', () => {
  const refDate = new Date('2026-09-28T00:00:00Z');

  it('generates low-stock alerts with deep link to procurement tab', () => {
    const alerts = InventoryAlertService.generateAlerts(
      initialDrugs,
      initialBatches,
      [],
      [],
      refDate
    );

    const lowStockAlerts = alerts.filter(
      (a) => a.type === 'low_stock' || a.type === 'stockout_risk'
    );
    expect(lowStockAlerts.length).toBeGreaterThan(0);

    const firstLowStock = lowStockAlerts[0];
    expect(firstLowStock.targetTab).toBe('procurement');
    expect(firstLowStock.recommendedAction).toBeDefined();
  });

  it('generates near-expiry alerts with deep link to appropriate tab', () => {
    // Calpol 650 in initialBatches has expiry '2026-10-31', which is near expiry relative to 2026-09-28 (<90 days)!
    const alerts = InventoryAlertService.generateAlerts(
      initialDrugs,
      initialBatches,
      [],
      [],
      refDate
    );

    const nearExpiryAlerts = alerts.filter((a) => a.type === 'near_expiry');
    expect(nearExpiryAlerts.length).toBeGreaterThan(0);

    const firstExpiryAlert = nearExpiryAlerts[0];
    expect(['inventory', 'counter']).toContain(firstExpiryAlert.targetTab);
    expect(firstExpiryAlert.batchNumber).toBeDefined();
  });

  it('flags zero-stock items as critical stockouts', () => {
    const depletedBatches: StockBatch[] = initialBatches.map((b) =>
      b.drugId === 'a0000000-0000-0000-0000-000000000001'
        ? { ...b, quantityOnHand: 0 }
        : b
    );

    const alerts = InventoryAlertService.generateAlerts(
      initialDrugs,
      depletedBatches,
      [],
      [],
      refDate
    );
    const stockoutAlert = alerts.find(
      (a) => a.drugId === 'a0000000-0000-0000-0000-000000000001' && a.severity === 'critical'
    );

    expect(stockoutAlert).toBeDefined();
    expect(stockoutAlert?.type).toBe('stockout_risk');
  });
});
