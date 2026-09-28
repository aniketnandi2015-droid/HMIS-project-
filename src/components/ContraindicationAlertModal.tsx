import React from 'react';
import { AlertOctagon, ShieldAlert, XCircle, FileText } from 'lucide-react';
import { DrugMaster, ContraindicationReference } from '../lib/types/pharmaassist';

interface ContraindicationAlertModalProps {
  drug: DrugMaster;
  conflicts: ContraindicationReference[];
  onDismiss: () => void;
  onOverride: (reason: string) => void;
}

export const ContraindicationAlertModal: React.FC<ContraindicationAlertModalProps> = ({
  drug,
  conflicts,
  onDismiss,
  onOverride,
}) => {
  const [overrideReason, setOverrideReason] = React.useState('');
  const [showOverrideInput, setShowOverrideInput] = React.useState(false);

  const hasHighSeverity = conflicts.some((c) => c.severity === 'High');

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-rose-500 max-w-lg w-full p-6 sm:p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertOctagon className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-rose-100 text-rose-700">
              Clinical Safety Gate (NFR-SAFE-01)
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              Contraindication Conflict
            </h2>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-semibold text-rose-800 uppercase">Selected Medicine</div>
          <p className="text-base font-bold text-slate-900">{drug.brandName}</p>
          <p className="text-xs text-slate-600 font-mono">
            {drug.genericName} • {drug.strength}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Detected Reference Conflicts ({conflicts.length})
          </h3>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-700">{conflict.conditionKey}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                    {conflict.severity} Hazard
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{conflict.description}</p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100">
                  <FileText className="w-3 h-3" />
                  <span>Reference: {conflict.referenceId} ({conflict.version})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasHighSeverity && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Dispatch Gated:</strong> High-severity clinical conflict must be addressed or verified by a qualified pharmacist before dispensing.
            </span>
          </div>
        )}

        {showOverrideInput && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700">
              Pharmacist Clinical Verification Notes / Override Reason:
            </label>
            <input
              type="text"
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Doctor contacted; approved under close monitoring..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:border-rose-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition min-h-[44px] cursor-pointer"
          >
            Cancel & Pick Safe Alternative
          </button>

          {!showOverrideInput ? (
            <button
              onClick={() => setShowOverrideInput(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-md shadow-amber-600/20 min-h-[44px] cursor-pointer"
            >
              Verify & Resolve Safety Gate
            </button>
          ) : (
            <button
              disabled={!overrideReason.trim()}
              onClick={() => onOverride(overrideReason)}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 min-h-[44px] cursor-pointer"
            >
              Confirm Clinical Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
