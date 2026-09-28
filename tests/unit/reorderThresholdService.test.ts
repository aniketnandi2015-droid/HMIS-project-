import { describe, it, expect } from 'vitest';
import { ReorderThresholdService } from '../../src/lib/domain/inventory/reorderThresholdService';

describe('ReorderThresholdService (FR-INV-06, BR-01)', () => {
  it('uses fixed threshold when velocity is low', () => {
    // 10 units fixed vs 0.5 units/day * 7 days = 3.5 -> 4
    const threshold = ReorderThresholdService.calculateReorderThreshold(10, 0.5, 7);
    expect(threshold).toBe(10);
  });

  it('uses velocity-based threshold when sales volume exceeds fixed threshold', () => {
    // 10 units fixed vs 3 units/day * 7 days = 21
    const threshold = ReorderThresholdService.calculateReorderThreshold(10, 3, 7);
    expect(threshold).toBe(21);
  });

  it('correctly flags low stock when available quantity is <= threshold', () => {
    expect(ReorderThresholdService.isLowStock(10, 10)).toBe(true);
    expect(ReorderThresholdService.isLowStock(5, 10)).toBe(true);
    expect(ReorderThresholdService.isLowStock(11, 10)).toBe(false);
  });
});
