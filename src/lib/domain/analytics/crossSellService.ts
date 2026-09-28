import {
  DrugMaster,
  StockBatch,
  Transaction,
  CrossSellSuggestion,
  VisitType,
  IndicationCategory,
} from '../../types/pharmaassist';
import { NearExpiryService } from '../inventory/nearExpiryService';

export class CrossSellService {
  /**
   * Generates predictive cross-sell recommendations (FR-ANL-03 & Section 8):
   * 1. Evaluates basket co-occurrence and conditional probability P(B|A)
   * 2. Recency weighting (recent 30 days given higher weight)
   * 3. Visit-type and indication category affinity
   * 4. Excludes out-of-stock and expired items
   * 5. Returns top 3 advisory suggestions with explainability
   */
  public static getCrossSellSuggestions(
    sourceDrugId: string,
    transactions: Transaction[],
    allDrugs: DrugMaster[],
    allBatches: StockBatch[],
    currentDate: Date = new Date(),
    targetVisitType?: VisitType,
    targetIndication?: IndicationCategory
  ): CrossSellSuggestion[] {
    const coOccurrenceCount: Record<string, number> = {};
    const weightedScoreMap: Record<string, number> = {};
    let sourceTotalVisits = 0;

    const now = currentDate.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Analyze past transactions
    for (const tx of transactions) {
      const items = tx.items || [];
      const containsSource = items.some((it) => it.drugId === sourceDrugId);
      if (!containsSource) continue;

      sourceTotalVisits++;

      // Recency multiplier: 1.5x for transactions in last 30 days
      const txAge = now - new Date(tx.timestamp).getTime();
      const recencyMultiplier = txAge <= thirtyDaysMs ? 1.5 : 1.0;

      // Affinity multiplier
      const visitTypeMultiplier = targetVisitType && tx.visitType === targetVisitType ? 1.2 : 1.0;

      for (const it of items) {
        if (it.drugId !== sourceDrugId) {
          coOccurrenceCount[it.drugId] = (coOccurrenceCount[it.drugId] || 0) + 1;

          let scoreDelta = recencyMultiplier * visitTypeMultiplier;
          if (targetIndication && it.indicationCategory === targetIndication) {
            scoreDelta *= 1.3;
          }

          weightedScoreMap[it.drugId] = (weightedScoreMap[it.drugId] || 0) + scoreDelta;
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

    const sortedDrugIds = Object.keys(weightedScoreMap).sort(
      (a, b) => weightedScoreMap[b] - weightedScoreMap[a]
    );

    let rank = 1;
    for (const drugId of sortedDrugIds) {
      if (!availableDrugIds.has(drugId)) continue;
      const drug = allDrugs.find((d) => d.id === drugId && d.active);
      if (!drug) continue;

      const supportCount = coOccurrenceCount[drugId] || 1;
      const condProb = sourceTotalVisits > 0 ? supportCount / sourceTotalVisits : 0.5;
      const score = Number(weightedScoreMap[drugId].toFixed(2));

      // Build plain-language explanation
      let explanation = `Frequently co-purchased (${supportCount} visits, P=${Math.round(condProb * 100)}%).`;
      if (drug.indicationCategory && targetIndication && drug.indicationCategory === targetIndication) {
        explanation += ` High affinity with ${targetIndication}.`;
      }

      suggestions.push({
        id: `cross-sell-${sourceDrugId}-${drugId}`,
        sourceDrugId,
        suggestedDrugId: drugId,
        suggestedDrug: drug,
        supportCount,
        rank,
        conditionalProbability: Number(condProb.toFixed(2)),
        score,
        explanation,
      });

      rank++;
      if (suggestions.length >= 3) break;
    }

    return suggestions;
  }
}
