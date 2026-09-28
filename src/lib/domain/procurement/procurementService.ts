import {
  DrugMaster,
  StockBatch,
  UnmetDemand,
  DemandForecast,
  Supplier,
} from '../../types/pharmaassist';
import { ReorderThresholdService } from '../inventory/reorderThresholdService';

export interface ProcurementRecommendation {
  drugId: string;
  drugName: string;
  genericName: string;
  currentStock: number;
  reorderThreshold: number;
  unmetDemandCount: number;
  forecastUnits: number;
  priorityScore: number;
  preferredSupplier?: Supplier;
  recommendedOrderQuantity: number;
}

export class ProcurementService {
  /**
   * Generates ranked procurement recommendation list (FR-PROC-01):
   * RecommendationScore = low-stock urgency + unmet-demand signal + forecast signal
   */
  public static generateRecommendations(
    drugs: DrugMaster[],
    batches: StockBatch[],
    unmetDemands: UnmetDemand[],
    forecasts: DemandForecast[],
    suppliers: Supplier[]
  ): ProcurementRecommendation[] {
    const recommendations: ProcurementRecommendation[] = [];

    // Group batches by drug
    const stockMap: Record<string, number> = {};
    for (const b of batches) {
      stockMap[b.drugId] = (stockMap[b.drugId] || 0) + b.quantityOnHand;
    }

    // Unmet demand count per drug
    const unmetCountMap: Record<string, number> = {};
    for (const ud of unmetDemands) {
      if (!ud.fulfilled && ud.normalizedDrugId) {
        unmetCountMap[ud.normalizedDrugId] = (unmetCountMap[ud.normalizedDrugId] || 0) + 1;
      }
    }

    // Forecast units map
    const forecastMap: Record<string, number> = {};
    for (const fc of forecasts) {
      forecastMap[fc.drugId] = (forecastMap[fc.drugId] || 0) + fc.forecastUnits;
    }

    for (const drug of drugs) {
      if (!drug.active) continue;

      const currentStock = stockMap[drug.id] || 0;
      const threshold = 15; // default
      const unmetCount = unmetCountMap[drug.id] || 0;
      const forecastQty = forecastMap[drug.id] || 0;

      const isLowStock = ReorderThresholdService.isLowStock(currentStock, threshold);

      // If low stock or unmet demand exists, create recommendation
      if (isLowStock || unmetCount > 0) {
        // Priority score formula:
        // Stock deficit weight (max 50) + Unmet demand weight (10 per occurrence) + Forecast demand
        const stockDeficit = Math.max(0, threshold - currentStock);
        const priorityScore = stockDeficit * 3 + unmetCount * 15 + Math.round(forecastQty * 1.5);

        // Find supplier supplying this drug
        const supplier = suppliers.find((s) =>
          s.drugsSupplied.some(
            (name) =>
              name.toLowerCase().includes(drug.brandName.toLowerCase()) ||
              name.toLowerCase().includes(drug.genericName.toLowerCase())
          )
        );

        // Recommended quantity: replenishes to threshold + covers forecast + unmet demand
        const recommendedOrderQuantity = Math.max(
          20,
          stockDeficit + Math.max(unmetCount * 5, Math.round(forecastQty))
        );

        recommendations.push({
          drugId: drug.id,
          drugName: drug.brandName,
          genericName: drug.genericName,
          currentStock,
          reorderThreshold: threshold,
          unmetDemandCount: unmetCount,
          forecastUnits: forecastQty,
          priorityScore,
          preferredSupplier: supplier,
          recommendedOrderQuantity,
        });
      }
    }

    // Sort descending by priority score
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    return recommendations;
  }
}
