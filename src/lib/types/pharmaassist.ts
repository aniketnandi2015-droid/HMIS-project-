// ==============================================================================
// PharmaAssist Core Domain Types (v2.1 + Controlled Extensions)
// Strictly adhering to SRS v2.1, SDD v0.1 & Controlled Architecture Extensions
// ==============================================================================

export type ScheduleCategory = 'OTC' | 'Prescription' | 'Schedule H' | 'Schedule X';

export type IndicationCategory =
  | 'Respiratory & Flu'
  | 'Cardiovascular & Hypertension'
  | 'Gastrointestinal & Hydration'
  | 'Diabetes & Metabolic'
  | 'Analgesic & Pain Management'
  | 'Dermatology & Allergy'
  | 'General Health';

export const INDICATION_CATEGORIES: IndicationCategory[] = [
  'Respiratory & Flu',
  'Cardiovascular & Hypertension',
  'Gastrointestinal & Hydration',
  'Diabetes & Metabolic',
  'Analgesic & Pain Management',
  'Dermatology & Allergy',
  'General Health',
];

export interface DrugMaster {
  id: string;
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  scheduleCategory: ScheduleCategory;
  indicationCategory?: IndicationCategory;
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
  indicationCategory?: IndicationCategory;
  drugName?: string;
  batchNumber?: string;
}

export interface UnmetDemand {
  id: string;
  requestedDrugText: string;
  normalizedDrugId?: string;
  indicationCategory?: IndicationCategory;
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
  conditionalProbability?: number; // P(B|A)
  recencyWeight?: number;
  score?: number;
  explanation?: string;
}

export interface CrossSellEvent {
  id: string;
  sourceDrugId: string;
  suggestedDrugId: string;
  accepted: boolean;
  score: number;
  visitType: VisitType;
  indicationCategory?: IndicationCategory;
  createdAt: string;
}

export interface DemandForecast {
  id: string;
  drugId: string;
  drugName?: string;
  horizonDays: number;
  visitType: VisitType;
  indicationCategory?: IndicationCategory | 'All';
  forecastUnits: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  trendDirection?: 'increasing' | 'stable' | 'decreasing';
  modelVersion: string;
  generatedAt: string;
  eligible: boolean;
  fallbackReason?: string;
  trainingDataPoints?: number;
  mapeError?: number;
  explanation?: string;
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

export interface ProcurementRecommendation {
  drugId: string;
  drugName: string;
  genericName: string;
  currentStock: number;
  reorderThreshold: number;
  onOrderQuantity: number;
  unmetDemandCount: number;
  forecastUnits: number;
  priorityScore: number;
  preferredSupplier?: Supplier;
  recommendedOrderQuantity: number;
  daysToStockout?: number;
  explanation: string;
}

export interface DrugAlert {
  type: 'low_stock' | 'near_expiry' | 'stockout_risk' | 'revenue_leakage';
  severity: 'critical' | 'warning' | 'info';
  drugId: string;
  drugName: string;
  batchNumber?: string;
  details: string;
  metric: string;
  recommendedAction: string;
  targetTab: 'inventory' | 'procurement' | 'counter';
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
    supplierId: string;
    supplierName: string;
    onTimeRate: number;
    discrepancyCount: number;
    qualityFlags: number;
    overallScore: number;
  }[];
  drugSpecificAlerts: DrugAlert[];
  forecastInsights: {
    topTrending: DemandForecast[];
    indicationTrend: { category: string; sharePercent: number; trend: string }[];
  };
  flagsAndAlerts: {
    lowStockCount: number;
    nearExpiryCount: number;
    revenueLeakageCount: number;
    wastageValue: number;
  };
}

// Smart Scan & OCR Types
export interface OcrExtractedFields {
  rawText: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  batchNumber?: string;
  lotNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  barcodeNumber?: string;
  confidence: number; // 0 to 1
}

export interface SmartScanMatchResult {
  matchedDrug?: DrugMaster;
  matchedBatch?: StockBatch;
  confidence: number;
  extractedFields: OcrExtractedFields;
  requiresConfirmation: boolean;
  matchScore: number;
  notes: string;
  expiryWarning?: string;
}

// Commercial-Style POS Cart State (Section 5)
export type CartSafetyStatus =
  | 'pending'
  | 'clear'
  | 'prescription_required'
  | 'safety_review_required'
  | 'blocked';

export interface CartItem {
  id: string; // Line item unique identifier
  drugId: string;
  drugName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  selectedBatchId: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
  maxAvailableQuantity: number;
  discountPercent: number;
  discountAmount: number;
  extendedValue: number;
  visitType: VisitType;
  prescriptionSighted: boolean;
  indicationCategory?: IndicationCategory;
  safetyStatus: CartSafetyStatus;
  safetyConflicts?: ContraindicationReference[];
  stockStatus: 'available' | 'low' | 'out_of_stock';
}

// Stock Discrepancy & Controlled Physical-Count Reconciliation (Section 10)
export type DiscrepancySeverity = 'none' | 'minor' | 'material' | 'significant';

export type DiscrepancyReasonCode =
  | 'physical_count_correction'
  | 'damage_breakage'
  | 'expired_stock'
  | 'missing_unaccounted'
  | 'receiving_discrepancy'
  | 'data_entry_correction'
  | 'other';

export interface StockDiscrepancyRecord {
  id: string;
  drugId: string;
  drugName: string;
  batchId: string;
  batchNumber: string;
  systemQuantity: number;
  physicalQuantity: number;
  discrepancyDelta: number; // Physical - System
  discrepancyPercent: number; // abs(Delta) / max(System, 1) * 100
  direction: 'shortage' | 'excess' | 'none';
  severity: DiscrepancySeverity;
  reasonCode: DiscrepancyReasonCode;
  notes?: string;
  timestamp: string;
  reconciled: boolean;
}
