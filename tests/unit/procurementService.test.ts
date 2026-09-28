import { describe, it, expect } from 'vitest';
import { ProcurementService } from '../../src/lib/domain/procurement/procurementService';
import {
  initialDrugs,
  initialBatches,
  initialSuppliers,
} from '../../src/lib/data/initialData';
import { UnmetDemand, DemandForecast, PurchaseOrder } from '../../src/lib/types/pharmaassist';

describe('ProcurementService (Transparent Formula & On-Order Deduplication)', () => {
  it('generates ranked recommendations prioritizing low stock and unmet demands', () => {
    const unmetDemands: UnmetDemand[] = [
      {
        id: 'ud-1',
        requestedDrugText: 'Calpol 650',
        normalizedDrugId: 'a0000000-0000-0000-0000-000000000003',
        timestamp: new Date().toISOString(),
        reason: 'stockout',
        fulfilled: false,
      },
    ];

    const recs = ProcurementService.generateRecommendations(
      initialDrugs,
      initialBatches,
      unmetDemands,
      [],
      initialSuppliers,
      []
    );

    expect(recs.length).toBeGreaterThan(0);
    // Highest priority score should be at top
    for (let i = 0; i < recs.length - 1; i++) {
      expect(recs[i].priorityScore).toBeGreaterThanOrEqual(recs[i + 1].priorityScore);
    }

    const calpolRec = recs.find((r) => r.drugName === 'Calpol 650');
    expect(calpolRec).toBeDefined();
    expect(calpolRec?.unmetDemandCount).toBe(1);
    expect(calpolRec?.explanation).toContain('unfulfilled customer requests logged');
  });

  it('deduplicates on-order stock from active purchase orders to avoid over-ordering', () => {
    const calpolId = 'a0000000-0000-0000-0000-000000000003';
    const activePOs: PurchaseOrder[] = [
      {
        id: 'PO-TEST-1',
        supplierId: initialSuppliers[0].id,
        createdAt: new Date().toISOString(),
        promisedLeadTimeDays: 2,
        status: 'sent',
        items: [
          {
            id: 'poi-1',
            purchaseOrderId: 'PO-TEST-1',
            drugId: calpolId,
            orderedQuantity: 100, // On order!
          },
        ],
      },
    ];

    const recs = ProcurementService.generateRecommendations(
      initialDrugs,
      initialBatches,
      [],
      [],
      initialSuppliers,
      activePOs
    );

    const calpolRec = recs.find((r) => r.drugId === calpolId);
    if (calpolRec) {
      expect(calpolRec.onOrderQuantity).toBe(100);
      expect(calpolRec.explanation).toContain('Deducted 100 units already on order');
    }
  });

  it('integrates demand forecasts into recommended order quantity', () => {
    const doloId = 'a0000000-0000-0000-0000-000000000004';
    const forecasts: DemandForecast[] = [
      {
        drugId: doloId,
        drugName: 'Dolo 650',
        periodDays: 7,
        forecastUnits: 80,
        modelType: 'stable',
        confidenceInterval: { lower: 70, upper: 90 },
        historicalDailyDemand: [],
        backtestMapePercent: 5.2,
      },
    ];

    const recs = ProcurementService.generateRecommendations(
      initialDrugs,
      initialBatches,
      [],
      forecasts,
      initialSuppliers,
      []
    );

    const doloRec = recs.find((r) => r.drugId === doloId);
    if (doloRec) {
      expect(doloRec.forecastUnits).toBe(80);
      expect(doloRec.explanation).toContain('7-day projected demand: 80 units');
    }
  });
});
