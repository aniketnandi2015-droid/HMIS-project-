import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ArrowRight,
  FileText,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  DiscrepancyReasonCode,
  StockDiscrepancyRecord,
} from '../lib/types/pharmaassist';
import { DiscrepancyService } from '../lib/domain/inventory/discrepancyService';
import { AnimatedNumber } from './common/AnimatedNumber';

interface StockDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  drugs: DrugMaster[];
  batches: StockBatch[];
  preselectedBatchId?: string;
  onConfirmAdjustment: (
    batchId: string,
    delta: number,
    reasonCode: DiscrepancyReasonCode,
    notes?: string,
    record?: StockDiscrepancyRecord
  ) => void;
}

export const StockDiscrepancyModal: React.FC<StockDiscrepancyModalProps> = ({
  isOpen,
  onClose,
  drugs,
  batches,
  preselectedBatchId,
  onConfirmAdjustment,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    preselectedBatchId || batches[0]?.id || ''
  );

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || batches[0],
    [batches, selectedBatchId]
  );

  const selectedDrug = useMemo(
    () => (selectedBatch ? drugs.find((d) => d.id === selectedBatch.drugId) : null),
    [drugs, selectedBatch]
  );

  const [physicalCount, setPhysicalCount] = useState<number>(
    selectedBatch?.quantityOnHand || 0
  );
  const [reasonCode, setReasonCode] = useState<DiscrepancyReasonCode>(
    'physical_count_correction'
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync physical count default when batch changes
  React.useEffect(() => {
    if (selectedBatch) {
      setPhysicalCount(selectedBatch.quantityOnHand);
    }
  }, [selectedBatch]);

  if (!isOpen || !selectedBatch || !selectedDrug) return null;

  const systemQuantity = selectedBatch.quantityOnHand;

  // Real-time discrepancy calculation
  const calc = DiscrepancyService.calculateDiscrepancy(
    systemQuantity,
    physicalCount,
    reasonCode,
    notes
  );

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (calc.delta === 0) {
      alert('Stock verified — no discrepancy detected. No ledger adjustment required.');
      onClose();
      return;
    }

    if (calc.validationError) {
      alert(calc.validationError);
      return;
    }

    setIsSubmitting(true);
    const creation = DiscrepancyService.createRecord(
      selectedDrug.id,
      selectedDrug.brandName,
      selectedBatch.id,
      selectedBatch.batchNumber,
      systemQuantity,
      physicalCount,
      reasonCode,
      notes
    );

    if (!creation.success || !creation.record) {
      alert(creation.error || 'Validation error');
      setIsSubmitting(false);
      return;
    }

    onConfirmAdjustment(
      selectedBatch.id,
      calc.delta,
      reasonCode,
      notes,
      creation.record
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discrepancy-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
    >
      <div className="w-full sm:max-w-lg bg-[#0b1728] border-t sm:border border-[#23455b] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#23455b] bg-[#102236] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="discrepancy-modal-title" className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Stock Discrepancy Reconciliation</span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Authoritative physical-count verification & audit logging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close discrepancy modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirm} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Batch Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Medicine Batch:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-slate-100 font-medium focus:border-cyan-400 focus:outline-hidden min-h-[44px]"
            >
              {batches.map((b) => {
                const drug = drugs.find((d) => d.id === b.drugId);
                return (
                  <option key={b.id} value={b.id}>
                    {drug?.brandName || 'Medicine'} • Batch {b.batchNumber} (Stock: {b.quantityOnHand})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Counts Comparison Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#102236] rounded-2xl border border-[#23455b]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Authoritative System Stock
              </span>
              <div className="text-xl font-black text-slate-200 font-mono">
                <AnimatedNumber value={systemQuantity} durationMs={200} /> units
              </div>
              <span className="text-[10px] text-slate-500">From stock ledger</span>
            </div>

            <div>
              <label htmlFor="physical-count-input" className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
                Physical Count
              </label>
              <input
                id="physical-count-input"
                type="number"
                min="0"
                value={physicalCount}
                onChange={(e) => setPhysicalCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full p-2 bg-[#0b1728] border border-cyan-500/50 rounded-xl text-xl font-black text-cyan-300 font-mono focus:border-cyan-400 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Actual counted count</span>
            </div>
          </div>

          {/* Discrepancy Calculation Banner */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              calc.delta === 0
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : calc.severity === 'significant'
                ? 'bg-rose-950/50 border-rose-800 text-rose-200 animate-danger-glow'
                : 'bg-amber-950/40 border-amber-800 text-amber-200 animate-warning-glow'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-bold">
                {calc.delta === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {calc.delta === 0
                    ? 'No Discrepancy'
                    : calc.direction === 'shortage'
                    ? `Shortage of ${Math.abs(calc.delta)} units`
                    : `Excess of ${calc.delta} units`}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  calc.severity === 'significant'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : calc.severity === 'material'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : calc.severity === 'minor'
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {calc.severity} ({calc.percent}%)
              </span>
            </div>

            <p className="text-[11px] opacity-90">
              {calc.delta === 0
                ? 'Stock verified — system and physical counts agree.'
                : `This reconciliation will apply a delta of ${calc.delta > 0 ? '+' : ''}${calc.delta} to authoritative batch ${selectedBatch.batchNumber}.`}
            </p>
          </div>

          {/* Reason Code Dropdown */}
          {calc.delta !== 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reconciliation Reason Code (Mandatory):
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as DiscrepancyReasonCode)}
                  className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-slate-100 font-medium focus:border-cyan-400 focus:outline-hidden min-h-[44px]"
                >
                  <option value="physical_count_correction">Physical count correction</option>
                  <option value="damage_breakage">Damage / breakage</option>
                  <option value="expired_stock">Expired stock / write-off</option>
                  <option value="missing_unaccounted">Missing / unaccounted stock</option>
                  <option value="receiving_discrepancy">Receiving shipment discrepancy</option>
                  <option value="data_entry_correction">Data entry correction</option>
                  <option value="other">Other (requires explanation)</option>
                </select>
              </div>

              {/* Explanatory Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Audit Notes {calc.isNoteRequired ? '(Mandatory for this severity)' : '(Optional)'}:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    calc.isNoteRequired
                      ? 'Required: Specify why this discrepancy occurred...'
                      : 'Optional audit comments...'
                  }
                  className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Ledger Change Preview (Section 11) */}
          <div className="p-3 bg-[#102236] rounded-xl border border-[#23455b] text-[11px] text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              This will change authoritative stock from <strong>{systemQuantity}</strong> to{' '}
              <strong className="text-cyan-400">{physicalCount}</strong> units.
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#102236] hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (calc.delta !== 0 && Boolean(calc.validationError))}
              className="flex-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl font-black transition cursor-pointer shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 min-h-[44px] touch-active"
            >
              <span>{calc.delta === 0 ? 'Verify & Close' : 'Confirm & Reconcile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
