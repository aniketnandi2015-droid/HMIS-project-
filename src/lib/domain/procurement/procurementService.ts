import {
  DrugMaster,
  StockBatch,
  UnmetDemand,
  DemandForecast,
  Supplier,
  PurchaseOrder,
  ProcurementRecommendation,
} from '../../types/pharmaassist';
import { ReorderThresholdService } from '../inventory/reorderThresholdService';

export class ProcurementService {
  /**
   * Generates ranked procurement recommendations (FR-PROC-01 & Section 10):
   * Transparent formula:
   * Net Required = (Threshold + Forecasted Demand + Unmet Demand) - (Current Stock + On-Order Stock)
   */
  public static generateRecommendations(
    drugs: DrugMaster[],
    batches: StockBatch[],
    unmetDemands: UnmetDemand[],
    forecasts: DemandForecast[],
    suppliers: Supplier[],
    activePurchaseOrders: PurchaseOrder[] = []
  ): ProcurementRecommendation[] {
    const recommendations: ProcurementRecommendation[] = [];

    // 1. Group available stock by drug
    const stockMap: Record<string, number> = {};
    for (const b of batches) {
      stockMap[b.drugId] = (stockMap[b.drugId] || 0) + b.quantityOnHand;
    }

    // 2. Group on-order quantity from pending POs (drafted, sent, confirmed) to prevent over-ordering
    const onOrderMap: Record<string, number> = {};
    for (const po of activePurchaseOrders) {
      if (po.status === 'sent' || po.status === 'confirmed' || po.status === 'drafted') {
        for (const item of po.items || []) {
          onOrderMap[item.drugId] = (onOrderMap[item.drugId] || 0) + item.orderedQuantity;
        }
      }
    }

    // 3. Unmet demand count per drug
    const unmetCountMap: Record<string, number> = {};
    for (const ud of unmetDemands) {
      if (!ud.fulfilled && ud.normalizedDrugId) {
        unmetCountMap[ud.normalizedDrugId] = (unmetCountMap[ud.normalizedDrugId] || 0) + 1;
      }
    }

    // 4. Forecast map per drug
    const forecastMap: Record<string, DemandForecast> = {};
    for (const fc of forecasts) {
      forecastMap[fc.drugId] = fc;
    }

    for (const drug of drugs) {
      if (!drug.active) continue;

      const currentStock = stockMap[drug.id] || 0;
      const threshold = 15; // default threshold
      const onOrderQty = onOrderMap[drug.id] || 0;
      const unmetCount = unmetCountMap[drug.id] || 0;
      const forecastObj = forecastMap[drug.id];
      const forecastQty = forecastObj ? forecastObj.forecastUnits : 15;

      const isLowStock = ReorderThresholdService.isLowStock(currentStock, threshold);

      // Estimate days to stockout
      const dailyVelocity = forecastQty / 7;
      const daysToStockout = dailyVelocity > 0 ? Math.max(0, Math.floor(currentStock / dailyVelocity)) : undefined;

      // Check if replenishment is needed:
      // Either stock is low, unmet demand exists, or current + on-order will stock out within lead time
      const netEffectiveStock = currentStock + onOrderQty;
      const bufferTarget = threshold + forecastQty + unmetCount * 5;

      if (isLowStock || unmetCount > 0 || netEffectiveStock < bufferTarget) {
        // Net order quantity: covers target deficit minus on-order stock
        const rawDeficit = bufferTarget - netEffectiveStock;
        const recommendedOrderQuantity = Math.max(10, Math.ceil(rawDeficit / 10) * 10); // rounded to pack batches of 10

        // Priority score formula:
        // Stock deficit (x3) + unmet demand (x15) + forecast demand (x1.5) - on-order coverage (x2)
        const priorityScore = Math.max(
          5,
          Math.max(0, threshold - currentStock) * 3 +
            unmetCount * 15 +
            Math.round(forecastQty * 1.5) -
            Math.round(onOrderQty * 0.5)
        );

        // Find preferred supplier
        const preferredSupplier = suppliers.find((s) =>
          s.drugsSupplied.some(
            (name) =>
              name.toLowerCase().includes(drug.brandName.toLowerCase()) ||
              name.toLowerCase().includes(drug.genericName.toLowerCase())
          )
        );

        // Human-readable explanation of why this was recommended
        let explanation = `Stock on hand (${currentStock}) is below target buffer (${bufferTarget}).`;
        if (onOrderQty > 0) {
          explanation += ` Deducted ${onOrderQty} units already on order.`;
        }
        if (unmetCount > 0) {
          explanation += ` ${unmetCount} unfulfilled customer requests logged.`;
        }
        if (forecastObj) {
          explanation += ` 7-day projected demand: ${forecastQty} units.`;
        }
        if (daysToStockout !== undefined) {
          explanation += ` Projected stockout in ${daysToStockout} day(s).`;
        }

        recommendations.push({
          drugId: drug.id,
          drugName: drug.brandName,
          genericName: drug.genericName,
          currentStock,
          reorderThreshold: threshold,
          onOrderQuantity: onOrderQty,
          unmetDemandCount: unmetCount,
          forecastUnits: forecastQty,
          priorityScore,
          preferredSupplier,
          recommendedOrderQuantity,
          daysToStockout,
          explanation,
        });
      }
    }

    // Sort descending by priority score
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    return recommendations;
  }
}
