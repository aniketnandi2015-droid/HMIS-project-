import { DemandForecast, Transaction, VisitType } from '../../types/pharmaassist';

export class DemandForecastService {
  /**
   * Generates demand forecast by drug and visit type (FR-ANL-02):
   * Cold start gate: Requires minimum transaction days (BR-05, default 30 days).
   * Fallback rule: Falls back to reorder threshold (BR-01) instead of making up numbers.
   */
  public static calculateForecast(
    drugId: string,
    visitType: VisitType,
    transactions: Transaction[],
    horizonDays: number = 7,
    minDataDays: number = 30,
    fallbackReorderThreshold: number = 15
  ): DemandForecast {
    // Filter transactions containing this drug and matching visit type
    const matchingTx = transactions.filter((tx) => {
      if (tx.visitType !== visitType) return false;
      return tx.items?.some((item) => item.drugId === drugId);
    });

    // Unique days with transactions
    const uniqueDays = new Set(
      matchingTx.map((tx) => new Date(tx.timestamp).toISOString().split('T')[0])
    );

    const isEligible = uniqueDays.size >= minDataDays;

    if (!isEligible) {
      return {
        id: `forecast-${drugId}-${visitType}`,
        drugId,
        horizonDays,
        visitType,
        forecastUnits: fallbackReorderThreshold,
        modelVersion: 'v1.0-cold-start-fallback',
        generatedAt: new Date().toISOString(),
        eligible: false,
        fallbackReason: `Insufficient transaction history (${uniqueDays.size}/${minDataDays} days). Applied reorder threshold fallback (BR-01).`,
      };
    }

    // Calculate total units sold
    let totalUnits = 0;
    matchingTx.forEach((tx) => {
      tx.items?.forEach((item) => {
        if (item.drugId === drugId) {
          totalUnits += item.quantity;
        }
      });
    });

    const dailyVelocity = totalUnits / uniqueDays.size;
    const projectedUnits = Math.round(dailyVelocity * horizonDays);

    return {
      id: `forecast-${drugId}-${visitType}`,
      drugId,
      horizonDays,
      visitType,
      forecastUnits: projectedUnits,
      modelVersion: 'v1.0-velocity-moving-avg',
      generatedAt: new Date().toISOString(),
      eligible: true,
    };
  }
}
