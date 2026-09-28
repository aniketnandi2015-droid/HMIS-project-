import { describe, it, expect } from 'vitest';
import { SafetyCheckService } from '../../src/lib/domain/safety/safetyCheckService';
import { DrugMaster, ContraindicationReference } from '../../src/lib/types/pharmaassist';

describe('SafetyCheckService (FR-POS-02, CON-04, NFR-SAFE-01)', () => {
  const amoxicillinDrug: DrugMaster = {
    id: 'd1',
    brandName: 'Augmentin 625',
    genericName: 'Amoxicillin + Clavulanic Acid',
    strength: '625mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'Prescription',
    listPrice: 20.0,
    identifiers: ['AUG625'],
    active: true,
  };

  const paracetamolDrug: DrugMaster = {
    id: 'd2',
    brandName: 'Dolo 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    scheduleCategory: 'OTC',
    listPrice: 2.0,
    identifiers: ['DOLO650'],
    active: true,
  };

  const mockReference: ContraindicationReference[] = [
    {
      id: 'ref-1',
      referenceId: 'REF-001',
      version: 'v1.0-ref',
      drugKey: 'Amoxicillin',
      conditionKey: 'Penicillin Allergy',
      interactionType: 'Drug-Allergy',
      severity: 'High',
      description: 'Severe anaphylactic danger for beta-lactams.',
      sourceDate: '2026-09-01',
    },
    {
      id: 'ref-2',
      referenceId: 'REF-002',
      version: 'v1.0-ref',
      drugKey: 'Paracetamol',
      conditionKey: 'Severe Liver Disease',
      interactionType: 'Drug-Condition',
      severity: 'High',
      description: 'Hepatotoxicity hazard in liver failure.',
      sourceDate: '2026-09-01',
    },
  ];

  it('detects penicillin allergy conflict and blocks dispatch (High severity)', () => {
    const result = SafetyCheckService.evaluateContraindications(
      amoxicillinDrug,
      ['Penicillin Allergy', 'Asthma'],
      mockReference
    );

    expect(result.hasConflict).toBe(true);
    expect(result.severity).toBe('High');
    expect(result.isDispatchBlocked).toBe(true);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].referenceId).toBe('REF-001');
  });

  it('returns clean safety check when conditions do not conflict', () => {
    const result = SafetyCheckService.evaluateContraindications(
      paracetamolDrug,
      ['Mild Headache', 'Hypertension'],
      mockReference
    );

    expect(result.hasConflict).toBe(false);
    expect(result.isDispatchBlocked).toBe(false);
    expect(result.conflicts.length).toBe(0);
  });

  it('returns clean check when condition list is empty', () => {
    const result = SafetyCheckService.evaluateContraindications(
      amoxicillinDrug,
      [],
      mockReference
    );

    expect(result.hasConflict).toBe(false);
    expect(result.isDispatchBlocked).toBe(false);
  });
});
