import {
  DiscrepancySeverity,
  DiscrepancyReasonCode,
  StockDiscrepancyRecord,
  StockAdjustmentReason,
} from '../../types/pharmaassist';

export interface DiscrepancyCalculationResult {
  delta: number;
  percent: number;
  direction: 'shortage' | 'excess' | 'none';
  severity: DiscrepancySeverity;
  isNoteRequired: boolean;
  validationError?: string;
}

export class DiscrepancyService {
  /**
   * Calculates discrepancy delta and classifies materiality percentage (Section 10.4).
   * Formula:
   * Discrepancy Delta = Physical Count - System Quantity
   * Discrepancy % = abs(Physical - System) / max(System, 1) * 100
   */
  public static calculateDiscrepancy(
    systemQuantity: number,
    physicalQuantity: number,
    reasonCode: DiscrepancyReasonCode = 'physical_count_correction',
    notes?: string
  ): DiscrepancyCalculationResult {
    const delta = physicalQuantity - systemQuantity;
    const absDiff = Math.abs(delta);
    const denominator = Math.max(systemQuantity, 1);
    const percent = Number(((absDiff / denominator) * 100).toFixed(1));

    let direction: 'shortage' | 'excess' | 'none' = 'none';
    if (delta < 0) direction = 'shortage';
    else if (delta > 0) direction = 'excess';

    // Materiality classification thresholds
    let severity: DiscrepancySeverity = 'none';
    if (delta === 0) {
      severity = 'none';
    } else if (percent <= 5.0) {
      severity = 'minor';
    } else if (percent <= 10.0) {
      severity = 'material';
    } else {
      severity = 'significant';
    }

    const isNoteRequired = severity === 'significant' || reasonCode === 'other';

    let validationError: string | undefined;
    if (isNoteRequired && (!notes || notes.trim().length < 3)) {
      validationError =
        severity === 'significant'
          ? 'A mandatory explanatory note is required for significant stock discrepancies (>10%).'
          : 'A mandatory note is required when selecting reason "Other".';
    }

    return {
      delta,
      percent,
      direction,
      severity,
      isNoteRequired,
      validationError,
    };
  }

  /**
   * Maps detailed discrepancy reason code to authoritative StockAdjustmentReason.
   */
  public static mapToStockAdjustmentReason(
    code: DiscrepancyReasonCode
  ): StockAdjustmentReason {
    switch (code) {
      case 'physical_count_correction':
        return 'physical_count_correction';
      case 'damage_breakage':
        return 'damage';
      case 'expired_stock':
        return 'expiry_write_off';
      case 'missing_unaccounted':
      case 'receiving_discrepancy':
      case 'data_entry_correction':
      case 'other':
      default:
        return 'other';
    }
  }

  /**
   * Constructs an authoritative discrepancy record for auditing and ledger reconciliation.
   */
  public static createRecord(
    drugId: string,
    drugName: string,
    batchId: string,
    batchNumber: string,
    systemQuantity: number,
    physicalQuantity: number,
    reasonCode: DiscrepancyReasonCode,
    notes?: string
  ): { success: boolean; record?: StockDiscrepancyRecord; error?: string } {
    const calc = this.calculateDiscrepancy(systemQuantity, physicalQuantity, reasonCode, notes);

    if (calc.validationError) {
      return { success: false, error: calc.validationError };
    }

    const record: StockDiscrepancyRecord = {
      id: `disc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      drugId,
      drugName,
      batchId,
      batchNumber,
      systemQuantity,
      physicalQuantity,
      discrepancyDelta: calc.delta,
      discrepancyPercent: calc.percent,
      direction: calc.direction,
      severity: calc.severity,
      reasonCode,
      notes: notes?.trim(),
      timestamp: new Date().toISOString(),
      reconciled: true,
    };

    return { success: true, record };
  }
}
