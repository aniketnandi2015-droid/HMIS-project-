import { describe, it, expect } from 'vitest';
import { PricingDiscountService } from '../../src/lib/domain/pricing/pricingDiscountService';

describe('PricingDiscountService (FR-POS-05, FR-POS-08, BR-02)', () => {
  it('correctly calculates extended value with zero discount', () => {
    const result = PricingDiscountService.calculatePricing(22.5, 4, 0);
    expect(result.extendedValue).toBe(90.0);
    expect(result.discountAmount).toBe(0.0);
    expect(result.isDiscountCeilingExceeded).toBe(false);
  });

  it('correctly calculates discount within the 5% reference ceiling', () => {
    const result = PricingDiscountService.calculatePricing(100.0, 1, 5.0, 5.0);
    expect(result.discountAmount).toBe(5.0);
    expect(result.extendedValue).toBe(95.0);
    expect(result.isDiscountCeilingExceeded).toBe(false);
  });

  it('flags transaction when discount exceeds reference ceiling (BR-02 revenue leakage flag)', () => {
    const result = PricingDiscountService.calculatePricing(100.0, 2, 8.0, 5.0);
    expect(result.discountAmount).toBe(16.0);
    expect(result.extendedValue).toBe(184.0);
    expect(result.isDiscountCeilingExceeded).toBe(true);
  });

  it('sanitizes negative quantities or discounts', () => {
    const result = PricingDiscountService.calculatePricing(10.0, -5, -20);
    expect(result.requestedQuantity).toBe(1);
    expect(result.discountPercent).toBe(0);
    expect(result.extendedValue).toBe(10.0);
  });
});
