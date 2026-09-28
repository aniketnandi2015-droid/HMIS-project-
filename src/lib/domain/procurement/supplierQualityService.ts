import { SupplierQualityEvent } from '../../types/pharmaassist';

export class SupplierQualityService {
  /**
   * Calculates rolling supplier quality score (FR-PROC-04) from past quality events:
   * Base score: 100 points
   * Deductions:
   *  - Late delivery: -15 pts
   *  - Discrepancy > 0: -10 pts
   *  - Quality flags (damaged/expired/rejected): -25 pts
   */
  public static calculateSupplierScore(events: SupplierQualityEvent[]): {
    score: number;
    onTimeRate: number;
    discrepancyCount: number;
    qualityFlagCount: number;
  } {
    if (!events || events.length === 0) {
      return {
        score: 100,
        onTimeRate: 100,
        discrepancyCount: 0,
        qualityFlagCount: 0,
      };
    }

    let onTimeCount = 0;
    let discrepancyCount = 0;
    let qualityFlagCount = 0;
    let totalScore = 0;

    for (const ev of events) {
      let eventScore = 100;

      if (ev.onTime) {
        onTimeCount++;
      } else {
        eventScore -= 15;
      }

      if (ev.quantityDiscrepancy !== 0) {
        discrepancyCount++;
        eventScore -= 10;
      }

      if (ev.qualityFlag && ev.qualityFlag !== 'none') {
        qualityFlagCount++;
        eventScore -= 25;
      }

      totalScore += Math.max(0, eventScore);
    }

    const averageScore = Math.round(totalScore / events.length);
    const onTimeRate = Math.round((onTimeCount / events.length) * 100);

    return {
      score: averageScore,
      onTimeRate,
      discrepancyCount,
      qualityFlagCount,
    };
  }
}
