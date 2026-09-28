import React, { useState } from 'react';
import { BookOpen, Check, ChevronRight, X, Sparkles } from 'lucide-react';

interface WalkthroughModalProps {
  onClose: () => void;
}

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '1. Structured Search & Barcode Scanning',
      desc: 'Type medicine brand, generic/salt name, or tap the Barcode icon to scan packaging using device camera or USB barcode scanner (FR-POS-01, FR-PLT-05).',
      tip: 'Try searching "Augmentin" or "Paracetamol".',
    },
    {
      title: '2. Real-Time Stock & Batch Verification',
      desc: 'See current available quantity, active batch/lot number, and nearest expiry date instantly. Batches near expiry (<90d) are highlighted with warnings (FR-POS-03, FR-INV-05).',
      tip: 'Expired batches are strictly excluded from selection.',
    },
    {
      title: '3. Clinical Safety & Contraindication Gate',
      desc: 'If patient conditions (e.g. Penicillin Allergy) conflict with the drug, a full-screen safety alert blocks dispatch until reviewed (FR-POS-02, NFR-SAFE-01).',
      tip: 'Reference-based safety rules protect patient health without AI hallucinations.',
    },
    {
      title: '4. Pricing, Discounts & Leakage Flags',
      desc: 'Unit price and extended totals are calculated automatically. Any discount exceeding the 5% reference ceiling is flagged for revenue-leakage tracking (FR-POS-05, BR-02).',
      tip: 'Discounts are recorded and audited without blocking customer flow.',
    },
    {
      title: '5. Atomic Stock Dispatch',
      desc: 'Confirming dispatch atomically decrements the batch quantity in the authoritative ledger and logs the transaction record in one step (FR-POS-06, FR-INV-01).',
      tip: 'Works offline seamlessly; transactions queue and sync on reconnection.',
    },
    {
      title: '6. Advisory Cross-Sell Suggestions & Handover',
      desc: 'After dispatch, up to three commonly co-purchased items (e.g. ORS with antibiotics) appear as advisory suggestions before closing the transaction (FR-ANL-03).',
      tip: 'Advisory suggestions never auto-add to the customer cart.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 text-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Guided Walkthrough (S07)</h3>
              <p className="text-[11px] text-slate-500">Learn PharmaAssist in 60 Seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx === currentStep ? 'bg-indigo-600' : idx < currentStep ? 'bg-indigo-300' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl space-y-2">
          <h4 className="font-bold text-sm text-indigo-950">{steps[currentStep].title}</h4>
          <p className="text-xs text-slate-700 leading-relaxed">{steps[currentStep].desc}</p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 pt-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pro Tip: {steps[currentStep].tip}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Skip Guide
          </button>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Ready to Dispense</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
