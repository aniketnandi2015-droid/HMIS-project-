import { describe, it, expect } from 'vitest';
import { CartService } from '../../src/lib/domain/pos/cartService';
import { initialDrugs, initialBatches, initialContraindications } from '../../src/lib/data/initialData';

describe('CartService (Commercial-Style POS Cart & Multi-Item Safety)', () => {
  const doloDrug = initialDrugs.find((d) => d.brandName === 'Dolo 650')!;
  const doloBatch = initialBatches.find((b) => b.drugId === doloDrug.id)!;

  const augmentinDrug = initialDrugs.find((d) => d.brandName === 'Augmentin 625 Duo')!;
  const augmentinBatch = initialBatches.find((b) => b.drugId === augmentinDrug.id)!;

  it('creates cart item with accurate pricing and clear safety status for routine OTC', () => {
    const cartItem = CartService.createCartItem(
      doloDrug,
      doloBatch,
      2,
      0,
      'OTC',
      false,
      'Analgesic & Pain Management',
      'None',
      initialContraindications
    );

    expect(cartItem.drugName).toBe('Dolo 650');
    expect(cartItem.quantity).toBe(2);
    expect(cartItem.unitPrice).toBe(doloDrug.listPrice);
    expect(cartItem.extendedValue).toBe(Number((doloDrug.listPrice * 2).toFixed(2)));
    expect(cartItem.safetyStatus).toBe('clear');
  });

  it('flags prescription requirement when prescription is not sighted for Rx medication', () => {
    const cartItem = CartService.createCartItem(
      augmentinDrug,
      augmentinBatch,
      1,
      0,
      'Prescription',
      false, // Not sighted
      'Respiratory & Flu',
      'None',
      initialContraindications
    );

    expect(cartItem.safetyStatus).toBe('prescription_required');
  });

  it('blocks cart item when patient condition triggers a contraindication conflict', () => {
    const cartItem = CartService.createCartItem(
      augmentinDrug,
      augmentinBatch,
      1,
      0,
      'Prescription',
      true,
      'Respiratory & Flu',
      'Penicillin Allergy', // Contraindication with Amoxicillin!
      initialContraindications
    );

    expect(cartItem.safetyStatus).toBe('blocked');
    expect(cartItem.safetyConflicts?.length).toBeGreaterThan(0);
  });

  it('updates item quantity while respecting stock bounds and recalculating line total', () => {
    const cartItem = CartService.createCartItem(
      doloDrug,
      doloBatch,
      2,
      0,
      'OTC',
      false,
      'Analgesic & Pain Management',
      'None',
      initialContraindications
    );

    const updated = CartService.updateItemQuantity(cartItem, 5);
    expect(updated.quantity).toBe(5);
    expect(updated.extendedValue).toBe(Number((doloDrug.listPrice * 5).toFixed(2)));

    // Clamps to max available
    const overStock = CartService.updateItemQuantity(cartItem, doloBatch.quantityOnHand + 50);
    expect(overStock.quantity).toBe(doloBatch.quantityOnHand);
  });

  it('calculates aggregated cart totals and identifies blocking issues across items', () => {
    const item1 = CartService.createCartItem(
      doloDrug,
      doloBatch,
      2,
      0,
      'OTC',
      false,
      'Analgesic & Pain Management',
      'None',
      initialContraindications
    );

    const item2 = CartService.createCartItem(
      augmentinDrug,
      augmentinBatch,
      1,
      0,
      'Prescription',
      false, // prescription not sighted
      'Respiratory & Flu',
      'None',
      initialContraindications
    );

    const totals = CartService.calculateTotals([item1, item2]);

    expect(totals.itemCount).toBe(2);
    expect(totals.totalUnits).toBe(3);
    expect(totals.subtotal).toBe(Number((doloDrug.listPrice * 2 + augmentinDrug.listPrice).toFixed(2)));
    expect(totals.hasBlockingIssues).toBe(true);
    expect(totals.blockingReasons.some((r) => r.includes('Prescription required'))).toBe(true);
  });
});
