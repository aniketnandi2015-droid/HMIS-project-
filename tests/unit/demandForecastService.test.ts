import { describe, it, expect } from 'vitest';
import { DemandForecastService } from '../../src/lib/domain/analytics/demandForecastService';
import { Transaction } from '../../src/lib/types/pharmaassist';

describe('DemandForecastService (FR-ANL-02, BR-04, BR-05)', () => {
  it('falls back to reorder threshold (BR-01) on cold start (<30 days history)', () => {
    // Only 2 transactions exist
    const txs: Transaction[] = [
      {
        id: 't1',
        timestamp: '2026-09-27T10:00:00Z',
        totalValue: 10,
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
            drugId: 'drug-x',
            stockBatchId: 'b1',
            quantity: 5,
            unitPrice: 2,
            discount: 0,
            extendedValue: 10,
          },
        ],
      },
    ];

    const forecast = DemandForecastService.calculateForecast(
      'drug-x',
      'OTC',
      txs,
      7,
      30, // threshold
      15 // fallback threshold
    );

    expect(forecast.eligible).toBe(false);
    expect(forecast.forecastUnits).toBe(15);
    expect(forecast.modelVersion).toBe('v1.0-cold-start-fallback');
    expect(forecast.fallbackReason).toContain('Insufficient transaction history');
  });

  it('calculates velocity moving average when minimum data days requirement is satisfied', () => {
    // Generate 30 days of transactions (10 units per day)
    const txs: Transaction[] = [];
    for (let i = 1; i <= 30; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      txs.push({
        id: `tx-${i}`,
        timestamp: `2026-08-${dayStr}T10:00:00Z`,
        totalValue: 20,
        totalDiscount: 0,
        visitType: 'OTC',
        prescriptionSighted: false,
        discountFlag: false,
        quantityCorrectionFlag: false,
        syncStatus: 'synced',
        items: [
          {
            id: `item-${i}`,
            transactionId: `tx-${i}`,
            drugId: 'drug-mature',
            stockBatchId: 'b1',
            quantity: 10,
            unitPrice: 2,
            discount: 0,
            extendedValue: 20,
          },
        ],
      });
    }

    const forecast = DemandForecastService.calculateForecast(
      'drug-mature',
      'OTC',
      txs,
      7, // 7 days horizon
      30,
      10
    );

    expect(forecast.eligible).toBe(true);
    // 10 units/day * 7 days = 70 units
    expect(forecast.forecastUnits).toBe(70);
    expect(forecast.modelVersion).toBe('v1.0-velocity-moving-avg');
  });
});
