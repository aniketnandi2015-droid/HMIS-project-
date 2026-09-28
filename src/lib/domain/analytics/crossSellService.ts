import { DrugMaster, StockBatch, Transaction, CrossSellSuggestion } from '../../types/pharmaassist';
import { NearExpiryService } from '../inventory/nearExpiryService';

export class CrossSellService {
  /**
   * Generates up to 3 cross-sell recommendations (FR-ANL-03):
   * 1. Evaluates past basket co-occurrence
   * 2. Excludes items that are inactive, out-of-stock, or expired
   * 3. Ranks by support count (frequency of co-purchase)
   * 4. Returns at most 3 items
   */
  public static getCrossSellSuggestions(
    sourceDrugId: string,
    transactions: Transaction[],
    allDrugs: DrugMaster[],
    allBatches: StockBatch[],
    currentDate: Date = new Date()
  ): CrossSellSuggestion[] {
    const coOccurrenceCount: Record<string, number> = {};

    // Analyze past transactions
    for (const tx of transactions) {
      const items = tx.items || [];
      const containsSource = items.some((it) => it.drugId === sourceDrugId);
      if (!containsSource) continue;

      for (const it of items) {
        if (it.drugId !== sourceDrugId) {
          coOccurrenceCount[it.drugId] = (coOccurrenceCount[it.drugId] || 0) + 1;
        }
      }
    }

    // Filter available, active, non-expired drugs
    const availableDrugIds = new Set<string>();
    for (const batch of allBatches) {
      if (batch.quantityOnHand > 0 && !NearExpiryService.isExpired(batch, currentDate)) {
        availableDrugIds.add(batch.drugId);
      }
    }

    const suggestions: CrossSellSuggestion[] = [];

    const sortedDrugIds = Object.keys(coOccurrenceCount).sort(
      (a, b) => coOccurrenceCount[b] - coOccurrenceCount[a]
    );

    let rank = 1;
    for (const drugId of sortedDrugIds) {
      if (!availableDrugIds.has(drugId)) continue;
      const drug = allDrugs.find((d) => d.id === drugId && d.active);
      if (!drug) continue;

      suggestions.push({
        id: `cross-sell-${sourceDrugId}-${drugId}`,
        sourceDrugId,
        suggestedDrugId: drugId,
        suggestedDrug: drug,
        supportCount: coOccurrenceCount[drugId],
        rank,
      });

      rank++;
      if (suggestions.length >= 3) break;
    }

    return suggestions;
  }
}
