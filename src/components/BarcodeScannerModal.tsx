import React, { useState } from 'react';
import { QrCode, Camera, Keyboard, X, Check } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScanResult: (code: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onScanResult,
  onClose,
}) => {
  const [manualCode, setManualCode] = useState('');

  const quickCodes = [
    { label: 'Augmentin 625 Duo', code: '890123456001' },
    { label: 'Dolo 650 (Paracetamol)', code: '890123456004' },
    { label: 'Calpol 650 (Near Expiry)', code: '890123456003' },
    { label: 'Electral ORS Sachet', code: '890123456010' },
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanResult(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 text-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Barcode & QR Scanner</h3>
              <p className="text-[11px] text-slate-500">Camera / Keyboard-Wedge Fallback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera simulation viewport */}
        <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center text-white border border-slate-800">
          <div className="w-48 h-28 border-2 border-emerald-400/80 rounded-lg relative flex items-center justify-center">
            <span className="w-full h-0.5 bg-emerald-400/70 absolute animate-pulse"></span>
            <QrCode className="w-10 h-10 text-emerald-400/40" />
          </div>
          <p className="text-[11px] text-slate-400 mt-3 font-mono">
            Align barcode or batch QR inside target reticle
          </p>
        </div>

        {/* Quick Simulated Batch Barcodes */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Quick Counter Tap Barcodes:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickCodes.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  onScanResult(item.code);
                  onClose();
                }}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs transition cursor-pointer"
              >
                <div className="font-semibold text-slate-800 truncate">{item.label}</div>
                <div className="text-[10px] font-mono text-slate-500">{item.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Keyboard-wedge input fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            Manual / USB Scanner Entry (HW-01 Fallback):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 890123456001 or AUG625"
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Input</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
