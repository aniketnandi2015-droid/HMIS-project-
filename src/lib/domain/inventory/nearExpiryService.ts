import { StockBatch } from '../../types/pharmaassist';

export class NearExpiryService {
  /**
   * Checks if a batch is expired relative to currentDate.
   */
  public static isExpired(batch: StockBatch, currentDate: Date = new Date()): boolean {
    const expiry = new Date(batch.expiryDate);
    // End of expiry date day
    expiry.setHours(23, 59, 59, 999);
    return expiry.getTime() < currentDate.getTime();
  }

  /**
   * Checks if a batch is near expiry within threshold days (default 90 days, BR-03).
   */
  public static isNearExpiry(
    batch: StockBatch,
    thresholdDays: number = 90,
    currentDate: Date = new Date()
  ): boolean {
    if (this.isExpired(batch, currentDate)) {
      return true; // Already expired
    }
    const expiry = new Date(batch.expiryDate).getTime();
    const now = currentDate.getTime();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diffDays <= thresholdDays && diffDays >= 0;
  }

  /**
   * Returns remaining days until expiry. Negative if already expired.
   */
  public static getDaysToExpiry(batch: StockBatch, currentDate: Date = new Date()): number {
    const expiry = new Date(batch.expiryDate).getTime();
    const now = currentDate.getTime();
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  }
}
