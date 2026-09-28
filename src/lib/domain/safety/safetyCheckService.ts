import {
  DrugMaster,
  ContraindicationReference,
  SafetyCheckResult,
} from '../../types/pharmaassist';

export class SafetyCheckService {
  /**
   * Evaluates deterministic contraindication rules from reference dataset.
   * Safety invariant: System uses the selected reference dataset; never synthesizes clinical rules.
   * Returns SafetyCheckResult with isDispatchBlocked = true if High severity conflict exists.
   */
  public static evaluateContraindications(
    drug: DrugMaster,
    patientConditionKeys: string[],
    referenceDataset: ContraindicationReference[]
  ): SafetyCheckResult {
    if (!patientConditionKeys || patientConditionKeys.length === 0) {
      return {
        hasConflict: false,
        conflicts: [],
        referenceVersion: 'v1.0-ref',
        isDispatchBlocked: false,
      };
    }

    const normalizedDrugGeneric = drug.genericName.toLowerCase().trim();
    const normalizedDrugBrand = drug.brandName.toLowerCase().trim();
    const normalizedConditions = patientConditionKeys.map((c) => c.toLowerCase().trim());

    const matchingConflicts = referenceDataset.filter((ref) => {
      const refDrugKey = ref.drugKey.toLowerCase().trim();
      const refConditionKey = ref.conditionKey.toLowerCase().trim();

      const drugMatches =
        normalizedDrugGeneric.includes(refDrugKey) ||
        refDrugKey.includes(normalizedDrugGeneric) ||
        normalizedDrugBrand.includes(refDrugKey);

      const conditionMatches = normalizedConditions.some(
        (cond) => cond.includes(refConditionKey) || refConditionKey.includes(cond)
      );

      return drugMatches && conditionMatches;
    });

    const hasConflict = matchingConflicts.length > 0;
    const hasHighSeverity = matchingConflicts.some((c) => c.severity === 'High');

    return {
      hasConflict,
      severity: hasHighSeverity ? 'High' : hasConflict ? 'Medium' : undefined,
      conflicts: matchingConflicts,
      referenceVersion: matchingConflicts[0]?.version || 'v1.0-ref',
      isDispatchBlocked: hasHighSeverity,
    };
  }
}
