import { DrugMaster, StockBatch, Transaction } from '../../types/pharmaassist';
import { NearExpiryService } from '../inventory/nearExpiryService';

export class MovementClassificationService {
  /**
   * Classifies stock velocity into Fast, Moderate, and Slow (FR-ANL-04, BR-06):
   * Fast: >= 10 units sold per week
   * Moderate: 3 to 9 units sold per week
   * Slow: < 3 units sold per week
   */
  public static classifyMovement(
    allDrugs: DrugMaster[],
    allBatches: StockBatch[],
    transactions: Transaction[],
    currentDate: Date = new Date(),
    lookbackDays: number = 30
  ): {
    fastMoving: { drug: DrugMaster; unitsSold: number; velocity: string }[];
    moderateMoving: { drug: DrugMaster; unitsSold: number; velocity: string }[];
    slowMoving: { drug: DrugMaster; unitsSold: number; isNearExpiry: boolean; daysWithoutSale: number }[];
  } {
    const lookbackTime = currentDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
    const unitsSoldMap: Record<string, number> = {};
    const lastSaleTimeMap: Record<string, number> = {};

    for (const tx of transactions) {
      const txTime = new Date(tx.timestamp).getTime();
      if (txTime < lookbackTime) continue;

      for (const it of tx.items || []) {
        unitsSoldMap[it.drugId] = (unitsSoldMap[it.drugId] || 0) + it.quantity;
        if (!lastSaleTimeMap[it.drugId] || txTime > lastSaleTimeMap[it.drugId]) {
          lastSaleTimeMap[it.drugId] = txTime;
        }
      }
    }

    const fastMoving: { drug: DrugMaster; unitsSold: number; velocity: string }[] = [];
    const moderateMoving: { drug: DrugMaster; unitsSold: number; velocity: string }[] = [];
    const slowMoving: { drug: DrugMaster; unitsSold: number; isNearExpiry: boolean; daysWithoutSale: number }[] = [];

    for (const drug of allDrugs) {
      const sold = unitsSoldMap[drug.id] || 0;
      const weeklyRate = sold / (lookbackDays / 7);

      const drugBatches = allBatches.filter((b) => b.drugId === drug.id && b.quantityOnHand > 0);
      const hasNearExpiryBatch = drugBatches.some((b) => NearExpiryService.isNearExpiry(b, 90, currentDate));

      const lastSale = lastSaleTimeMap[drug.id];
      const daysWithoutSale = lastSale
        ? Math.floor((currentDate.getTime() - lastSale) / (1000 * 60 * 60 * 24))
        : lookbackDays;

      if (weeklyRate >= 10) {
        fastMoving.push({ drug, unitsSold: sold, velocity: `${weeklyRate.toFixed(1)} units/wk` });
      } else if (weeklyRate >= 3) {
        moderateMoving.push({ drug, unitsSold: sold, velocity: `${weeklyRate.toFixed(1)} units/wk` });
      } else {
        slowMoving.push({
          drug,
          unitsSold: sold,
          isNearExpiry: hasNearExpiryBatch,
          daysWithoutSale,
        });
      }
    }

    // Sort fast descending, slow ascending
    fastMoving.sort((a, b) => b.unitsSold - a.unitsSold);
    slowMoving.sort((a, b) => (b.isNearExpiry ? 1 : 0) - (a.isNearExpiry ? 1 : 0) || a.unitsSold - b.unitsSold);

    return { fastMoving, moderateMoving, slowMoving };
  }
}
