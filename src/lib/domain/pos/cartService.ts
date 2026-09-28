import {
  CartItem,
  DrugMaster,
  StockBatch,
  ContraindicationReference,
  VisitType,
  IndicationCategory,
} from '../../types/pharmaassist';
import { SafetyCheckService } from '../safety/safetyCheckService';
import { PricingDiscountService } from '../pricing/pricingDiscountService';

export interface CartTotals {
  itemCount: number;
  totalUnits: number;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  hasBlockingIssues: boolean;
  blockingReasons: string[];
}

export class CartService {
  /**
   * Creates a new CartItem from detected drug and batch.
   */
  public static createCartItem(
    drug: DrugMaster,
    batch: StockBatch,
    quantity: number = 1,
    discountPercent: number = 0,
    visitType: VisitType = 'OTC',
    prescriptionSighted: boolean = false,
    indicationCategory?: IndicationCategory,
    patientCondition: string = 'None',
    contraindications: ContraindicationReference[] = []
  ): CartItem {
    const pricing = PricingDiscountService.calculatePricing(
      drug.listPrice,
      quantity,
      discountPercent,
      5.0
    );

    // Evaluate safety
    const patientConditions = patientCondition && patientCondition !== 'None' ? [patientCondition] : [];
    const safetyRes = SafetyCheckService.evaluateContraindications(
      drug,
      patientConditions,
      contraindications
    );
    const conflicts = safetyRes.conflicts;

    let safetyStatus: CartItem['safetyStatus'] = 'clear';
    if (safetyRes.hasConflict) {
      safetyStatus = safetyRes.isDispatchBlocked ? 'blocked' : 'safety_review_required';
    } else if (drug.scheduleCategory === 'Prescription' && !prescriptionSighted) {
      safetyStatus = 'prescription_required';
    }

    const stockStatus: CartItem['stockStatus'] =
      batch.quantityOnHand <= 0
        ? 'out_of_stock'
        : batch.quantityOnHand <= 15
        ? 'low'
        : 'available';

    return {
      id: `cart-${drug.id}-${batch.id}-${Date.now()}`,
      drugId: drug.id,
      drugName: drug.brandName,
      genericName: drug.genericName,
      strength: drug.strength,
      dosageForm: drug.dosageForm,
      selectedBatchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      unitPrice: drug.listPrice,
      quantity,
      maxAvailableQuantity: batch.quantityOnHand,
      discountPercent,
      discountAmount: pricing.discountAmount,
      extendedValue: pricing.extendedValue,
      visitType,
      prescriptionSighted,
      indicationCategory: indicationCategory || drug.indicationCategory || 'General Health',
      safetyStatus,
      safetyConflicts: conflicts,
      stockStatus,
    };
  }

  /**
   * Updates quantity and recalculates line pricing.
   */
  public static updateItemQuantity(
    item: CartItem,
    newQuantity: number
  ): CartItem {
    const validQty = Math.max(1, Math.min(newQuantity, item.maxAvailableQuantity));
    const pricing = PricingDiscountService.calculatePricing(
      item.unitPrice,
      validQty,
      item.discountPercent,
      5.0
    );

    return {
      ...item,
      quantity: validQty,
      discountAmount: pricing.discountAmount,
      extendedValue: pricing.extendedValue,
    };
  }

  /**
   * Updates discount percentage and recalculates line pricing.
   */
  public static updateItemDiscount(
    item: CartItem,
    discountPercent: number
  ): CartItem {
    const validDiscount = Math.max(0, Math.min(discountPercent, 100));
    const pricing = PricingDiscountService.calculatePricing(
      item.unitPrice,
      item.quantity,
      validDiscount,
      5.0
    );

    return {
      ...item,
      discountPercent: validDiscount,
      discountAmount: pricing.discountAmount,
      extendedValue: pricing.extendedValue,
    };
  }

  /**
   * Calculates aggregated cart totals and checks for any blocking conditions.
   */
  public static calculateTotals(items: CartItem[]): CartTotals {
    let totalUnits = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let grandTotal = 0;
    const blockingReasons: string[] = [];

    for (const item of items) {
      totalUnits += item.quantity;
      const lineGross = Number((item.unitPrice * item.quantity).toFixed(2));
      subtotal += lineGross;
      totalDiscount += item.discountAmount;
      grandTotal += item.extendedValue;

      // Check safety conflicts
      if (item.safetyStatus === 'blocked') {
        blockingReasons.push(
          `Safety conflict on ${item.drugName}: Contraindication detected with patient condition.`
        );
      }
      if (item.safetyStatus === 'prescription_required' && !item.prescriptionSighted) {
        blockingReasons.push(
          `Prescription required for ${item.drugName} (Prescription must be sighted before dispatch).`
        );
      }
      if (item.quantity > item.maxAvailableQuantity) {
        blockingReasons.push(
          `Insufficient stock for ${item.drugName} (Requested: ${item.quantity}, Available: ${item.maxAvailableQuantity}).`
        );
      }
    }

    return {
      itemCount: items.length,
      totalUnits,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      hasBlockingIssues: blockingReasons.length > 0,
      blockingReasons,
    };
  }
}
