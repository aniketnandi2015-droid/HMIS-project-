import { describe, it, expect } from 'vitest';
import { TimeSeriesForecastService } from '../../src/lib/domain/analytics/timeSeriesForecastService';
import { initialDrugs, initialRecentTransactions } from '../../src/lib/data/initialData';
import { Transaction } from '../../src/lib/types/pharmaassist';

describe('TimeSeriesForecastService (Time-Series Demand Forecasting with Holt-Winters / ETS)', () => {
  const doloId = 'a0000000-0000-0000-0000-000000000004';
  const doloDrug = initialDrugs.find((d) => d.id === doloId)!;

  it('calculates rolling backtest MAPE correctly over a test window', () => {
    const testSeries = [10, 12, 11, 14, 13, 12, 15, 16, 14, 15, 17, 18, 16, 17, 19, 20];
    const mape = TimeSeriesForecastService.calculateBacktestMape(testSeries, 7);

    expect(typeof mape).toBe('number');
    expect(mape).toBeGreaterThan(0);
    expect(mape).toBeLessThan(100);
  });

  it('generates 7-day Holt-Winters ETS forecast with confidence intervals and backtest MAPE', () => {
    const forecast = TimeSeriesForecastService.generateTimeSeriesForecast(
      doloDrug.id,
      doloDrug.brandName,
      initialRecentTransactions,
      'OTC',
      'All',
      7,
      20, // minDataDays
      15
    );

    expect(forecast.drugId).toBe(doloId);
    expect(forecast.drugName).toBe('Dolo 650');
    expect(forecast.horizonDays).toBe(7);
    expect(forecast.eligible).toBe(true);
    expect(forecast.modelVersion).toBe('v2.1-holt-winters-ets');
    expect(forecast.forecastUnits).toBeGreaterThan(0);
    expect(forecast.confidenceUpper).toBeGreaterThanOrEqual(forecast.confidenceLower);
    expect(['increasing', 'stable', 'decreasing']).toContain(forecast.trendDirection);
    expect(forecast.explanation).toContain('Holt-Winters');
  });

  it('falls back to reorder threshold on cold-start items with sparse transactions', () => {
    const sparseDrug = initialDrugs.find((d) => d.brandName === 'Atorva 10mg') || initialDrugs[0];
    const sparseTxs: Transaction[] = [
      {
        id: 'tx-sparse-1',
        timestamp: new Date().toISOString(),
        totalValue: 120,
        totalDiscount: 0,
        visitType: 'OTC',
        prescriptionSighted: false,
        discountFlag: false,
        quantityCorrectionFlag: false,
        syncStatus: 'synced',
        items: [
          {
            id: 'item-1',
            transactionId: 'tx-sparse-1',
            drugId: sparseDrug.id,
            stockBatchId: 'b-sparse',
            quantity: 5,
            unitPrice: 24,
            discount: 0,
            extendedValue: 120,
          },
        ],
      },
    ];

    const forecast = TimeSeriesForecastService.generateTimeSeriesForecast(
      sparseDrug.id,
      sparseDrug.brandName,
      sparseTxs,
      'OTC',
      'All',
      7,
      30, // Requires 30 days minimum
      15
    );

    expect(forecast.drugId).toBe(sparseDrug.id);
    expect(forecast.eligible).toBe(false);
    expect(forecast.modelVersion).toBe('v2.1-cold-start-fallback');
    expect(forecast.forecastUnits).toBe(15);
    expect(forecast.fallbackReason).toContain('Insufficient transaction history');
    expect(forecast.explanation).toContain('Cold start');
  });
});
