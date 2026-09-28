import { DrugMaster, StockBatch, SubstituteCandidate } from '../../types/pharmaassist';
import { NearExpiryService } from '../inventory/nearExpiryService';

export class SubstituteRankingService {
  /**
   * Filters and ranks substitute drugs (FR-POS-04):
   * 1. Same generic salt & strength
   * 2. Active product
   * 3. Available quantity > 0
   * 4. Excludes expired batches (FR-INV-05)
   * 5. Ranked by available stock & earliest valid expiry
   */
  public static findSubstitutes(
    targetDrug: DrugMaster,
    allDrugs: DrugMaster[],
    allBatches: StockBatch[],
    currentDate: Date = new Date()
  ): SubstituteCandidate[] {
    const targetGeneric = targetDrug.genericName.toLowerCase().trim();
    const targetStrength = targetDrug.strength.toLowerCase().trim();

    // 1. Identify matching alternative drug masters
    const candidateDrugs = allDrugs.filter((drug) => {
      if (drug.id === targetDrug.id || !drug.active) return false;
      const sameGeneric = drug.genericName.toLowerCase().trim() === targetGeneric;
      const sameStrength = drug.strength.toLowerCase().trim() === targetStrength;
      return sameGeneric && sameStrength;
    });

    if (candidateDrugs.length === 0) return [];

    const candidateDrugIds = new Set(candidateDrugs.map((d) => d.id));

    // 2. Identify matching valid stock batches
    const validBatches = allBatches.filter((batch) => {
      if (!candidateDrugIds.has(batch.drugId)) return false;
      if (batch.quantityOnHand <= 0) return false;
      if (NearExpiryService.isExpired(batch, currentDate)) return false; // Strictly exclude expired stock
      return true;
    });

    // 3. Map candidates with scoring
    const candidates: SubstituteCandidate[] = [];

    for (const batch of validBatches) {
      const drug = candidateDrugs.find((d) => d.id === batch.drugId);
      if (!drug) continue;

      const daysToExpiry = NearExpiryService.getDaysToExpiry(batch, currentDate);

      // Score: high stock is good (+batch.quantityOnHand), reasonable shelf life is good
      const score = batch.quantityOnHand * 10 + Math.min(daysToExpiry, 365);

      candidates.push({
        drug,
        stockBatch: batch,
        availableQuantity: batch.quantityOnHand,
        expiryDate: batch.expiryDate,
        score,
      });
    }

    // Sort descending by score (highest available stock & suitable shelf life)
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
  }
}
