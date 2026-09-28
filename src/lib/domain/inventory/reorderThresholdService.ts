export class ReorderThresholdService {
  /**
   * Calculates dynamic reorder threshold (BR-01):
   * Max of configured fixed threshold (default 10 units) OR 7-day trailing velocity.
   */
  public static calculateReorderThreshold(
    fixedThreshold: number = 10,
    dailyVelocity: number = 0,
    leadTimeDays: number = 7
  ): number {
    const velocityBasedThreshold = Math.ceil(dailyVelocity * leadTimeDays);
    return Math.max(fixedThreshold, velocityBasedThreshold);
  }

  /**
   * Checks if total available quantity for batches is at or below reorder threshold.
   */
  public static isLowStock(totalAvailableQuantity: number, threshold: number): boolean {
    return totalAvailableQuantity <= threshold;
  }
}
