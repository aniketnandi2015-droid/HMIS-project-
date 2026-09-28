import { PricingResult } from '../../types/pharmaassist';

export class PricingDiscountService {
  /**
   * Calculates unit price, discount amount, extended value, and checks BR-02 reference ceiling.
   * Default ceiling is 5.00%. Discounts above ceiling are logged and flagged, not blocked.
   */
  public static calculatePricing(
    unitPrice: number,
    quantity: number,
    discountPercent: number = 0,
    referenceCeilingPercent: number = 5.0
  ): PricingResult {
    const validQty = Math.max(1, Math.floor(quantity));
    const validUnitPrice = Math.max(0, unitPrice);
    const validDiscountPercent = Math.max(0, Math.min(100, discountPercent));

    const grossValue = validUnitPrice * validQty;
    const discountAmount = Number(((grossValue * validDiscountPercent) / 100).toFixed(2));
    const extendedValue = Number((grossValue - discountAmount).toFixed(2));
    const isDiscountCeilingExceeded = validDiscountPercent > referenceCeilingPercent;

    return {
      unitPrice: validUnitPrice,
      requestedQuantity: validQty,
      discountPercent: validDiscountPercent,
      discountAmount,
      extendedValue,
      isDiscountCeilingExceeded,
    };
  }
}
