// ==============================================================================
// PharmaAssist Core Domain Types
// Strictly adhering to SRS v2.1 & SDD v0.1 Data Dictionary
// ==============================================================================

export type ScheduleCategory = 'OTC' | 'Prescription' | 'Schedule H' | 'Schedule X';

export interface DrugMaster {
  id: string;
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  scheduleCategory: ScheduleCategory;
  listPrice: number;
  dosageDirection?: string;
  commonSideEffects?: string;
  identifiers: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockBatch {
  id: string;
  drugId: string;
  batchNumber: string;
  lotNumber: string;
  manufacturingDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantityOnHand: number;
  reorderThreshold: number;
  receivedFromSupplierId?: string;
  stockVersion: number;
  lastUpdatedAt: string;
}

export type StockAdjustmentReason =
  | 'damage'
  | 'expiry_write_off'
  | 'physical_count_correction'
  | 'other';

export interface StockAdjustment {
  id: string;
  stockBatchId: string;
  quantityDelta: number;
  reasonCode: StockAdjustmentReason;
  notes?: string;
  source: string;
  createdAt: string;
}

export interface ContraindicationReference {
  id: string;
  referenceId: string;
  version: string;
  drugKey: string;
  conditionKey: string;
  interactionType: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  sourceDate: string;
}

export type VisitType = 'OTC' | 'Prescription';

export interface Transaction {
  id: string;
  timestamp: string;
  totalValue: number;
  totalDiscount: number;
  visitType: VisitType;
  prescriptionSighted: boolean;
  discountFlag: boolean;
  quantityCorrectionFlag: boolean;
  syncStatus: 'pending' | 'synced' | 'conflict';
  deviceId?: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  drugId: string;
  stockBatchId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  extendedValue: number;
  drugName?: string;
  batchNumber?: string;
}

export interface UnmetDemand {
  id: string;
  requestedDrugText: string;
  normalizedDrugId?: string;
  timestamp: string;
  reason: 'no_match' | 'no_stock' | 'no_substitute';
  fulfilled: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  drugsSupplied: string[];
  promisedLeadTimeDays: number;
  active: boolean;
}

export type PurchaseOrderStatus = 'drafted' | 'sent' | 'confirmed' | 'received' | 'closed';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName?: string;
  createdAt: string;
  promisedLeadTimeDays: number;
  status: PurchaseOrderStatus;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  drugId: string;
  drugName?: string;
  orderedQuantity: number;
  receivedQuantity?: number;
}

export interface SupplierQualityEvent {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  onTime: boolean;
  quantityDiscrepancy: number;
  qualityFlag: 'none' | 'damaged' | 'expired_on_arrival' | 'rejected_batch';
  notes?: string;
  evaluatedAt: string;
}

export interface CrossSellSuggestion {
  id: string;
  sourceDrugId: string;
  suggestedDrugId: string;
  suggestedDrug?: DrugMaster;
  supportCount: number;
  rank: number;
}

export interface DemandForecast {
  id: string;
  drugId: string;
  horizonDays: number;
  visitType: VisitType;
  forecastUnits: number;
  modelVersion: string;
  generatedAt: string;
  eligible: boolean;
  fallbackReason?: string;
}

export interface StoreConfiguration {
  id: string;
  defaultLanguage: string;
  reorderThresholdDefault: number;
  reorderLeadTimeDays: number;
  discountReferenceCeilingPercent: number; // default 5.00
  nearExpiryDays: number; // default 90
  forecastHorizonDays: number; // default 7
  forecastMinDataDays: number; // default 30
  notificationChannel: string;
}

export interface SyncQueueItem {
  id: string;
  operationType: 'dispatch' | 'adjustment' | 'receipt';
  entityId: string;
  payload: any;
  baseVersion?: number;
  status: 'pending' | 'synced' | 'conflict' | 'retry';
  createdAt: string;
  syncedAt?: string;
}

export interface SafetyCheckResult {
  hasConflict: boolean;
  severity?: 'High' | 'Medium' | 'Low';
  conflicts: ContraindicationReference[];
  referenceVersion: string;
  isDispatchBlocked: boolean; // High severity blocks dispatch per SRS FR-POS-02 / NFR-SAFE-01
}

export interface PricingResult {
  unitPrice: number;
  requestedQuantity: number;
  discountPercent: number;
  discountAmount: number;
  extendedValue: number;
  isDiscountCeilingExceeded: boolean; // Flagged per BR-02 / FR-POS-08
}

export interface SubstituteCandidate {
  drug: DrugMaster;
  stockBatch: StockBatch;
  availableQuantity: number;
  expiryDate: string;
  score: number;
}

export interface InsightsData {
  salesTrend: {
    dates: string[];
    revenues: number[];
    units: number[];
    totalRevenue: number;
    totalUnits: number;
  };
  fastMovingDrugs: { drugName: string; unitsSold: number; velocity: string }[];
  slowMovingDrugs: { drugName: string; unitsSold: number; daysWithoutSale: number; isNearExpiry: boolean }[];
  supplierPerformance: {
    supplierName: string;
    onTimeRate: number;
    discrepancyCount: number;
    qualityFlags: number;
    overallScore: number;
  }[];
  flagsAndAlerts: {
    lowStockCount: number;
    nearExpiryCount: number;
    revenueLeakageCount: number;
    wastageValue: number;
  };
}
