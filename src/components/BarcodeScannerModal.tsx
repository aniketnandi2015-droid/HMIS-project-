import React, { useState } from 'react';
import {
  Camera,
  FileText,
  Keyboard,
  X,
  Sparkles,
  AlertTriangle,
  QrCode,
  ScanLine,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { DrugMaster, StockBatch, SmartScanMatchResult } from '../lib/types/pharmaassist';
import { SmartScanService } from '../lib/domain/ocr/smartScanService';

interface SmartScanModalProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  onScanResult: (match: SmartScanMatchResult) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<SmartScanModalProps> = ({
  drugs,
  batches,
  onScanResult,
  onClose,
}) => {
  const [scanMode, setScanMode] = useState<'ocr' | 'barcode' | 'manual'>('ocr');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<SmartScanMatchResult | null>(null);

  // Sample realistic pharmaceutical package text samples for quick counter demonstration
  const demoPackageSamples = [
    {
      title: 'Augmentin 625 Duo Strip',
      text: 'AUGMENTIN 625 DUO\nAmoxicillin and Potassium Clavulanate Tablets IP\nStrength: 500mg+125mg\nB.No: AUG-B2026-01\nMFG: 10/25  EXP: 09/27\nMRP Rs. 202.50\n890123456001',
    },
    {
      title: 'Dolo 650 Blister Pack',
      text: 'DOLO 650 TABLETS\nParacetamol Tablets IP 650mg\nBatch: DOLO-B2026-02\nMFG DT: 02/26  EXP DT: 01/28\nMicro Labs Ltd\n890123456004',
    },
    {
      title: 'Calpol 650 (Near Expiry)',
      text: 'CALPOL 650\nParacetamol Tablets IP 650mg\nB.No. CAL-B2025-11\nMFG: 06/25 EXP: 10/26\nGSK Pharmaceuticals\n890123456003',
    },
    {
      title: 'Lipitor 20mg Carton',
      text: 'LIPITOR 20mg\nAtorvastatin Tablets\nBatch No: LIP-B2026-03  Lot: LOT-3320\nMFG: 12/25  EXP: 11/27\n890123456006',
    },
  ];

  // Run OCR Pipeline on text or simulated camera capture
  const processText = (text: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      const extracted = SmartScanService.parsePackagingText(text);
      const match = SmartScanService.matchToDrugMaster(extracted, drugs, batches);
      setMatchResult(match);
      setIsProcessing(false);
    }, 250);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      processText(inputText.trim());
    }
  };

  const handleConfirmMatch = () => {
    if (matchResult) {
      onScanResult(matchResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-cyan-900/60 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Smart Package Scan</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OCR Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Camera OCR & Barcode Decoding Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setScanMode('ocr')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${
              scanMode === 'ocr' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Smart OCR Scan</span>
          </button>
          <button
            onClick={() => setScanMode('barcode')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${
              scanMode === 'barcode' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barcode / QR</span>
          </button>
          <button
            onClick={() => setScanMode('manual')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${
              scanMode === 'manual' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Manual / USB</span>
          </button>
        </div>

        {/* Viewport Simulation / Camera UI */}
        {scanMode !== 'manual' && !matchResult && (
          <div className="space-y-3">
            <div className="relative aspect-video bg-[#070d1a] rounded-2xl overflow-hidden flex flex-col items-center justify-center text-white border border-slate-800">
              {/* Camera reticle */}
              <div className="w-56 h-32 border-2 border-cyan-400/80 rounded-xl relative flex items-center justify-center">
                <span className="w-full h-0.5 bg-cyan-400 absolute animate-pulse"></span>
                <ScanLine className="w-12 h-12 text-cyan-400/30" />
              </div>
              <p className="text-[11px] text-cyan-300/80 mt-3 font-mono">
                {scanMode === 'ocr'
                  ? 'Position medicine strip or carton within scanning frame'
                  : 'Align barcode or QR code with crosshairs'}
              </p>
            </div>

            {/* Quick Demo Samples simulating real OCR capture */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Simulated Camera Captures (Smart OCR Recognition):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoPackageSamples.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => processText(sample.text)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-700 text-left transition cursor-pointer text-xs space-y-0.5"
                  >
                    <div className="font-bold text-slate-200">{sample.title}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">Scan Package &gt;</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Manual Input Mode */}
        {scanMode === 'manual' && !matchResult && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Paste Package Text, Batch No., or Scanned Barcode:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. AUGMENTIN 625 B.No: AUG-B2026-01 EXP: 09/27"
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <FileText className="w-4 h-4" />
              <span>Analyze Package Text</span>
            </button>
          </form>
        )}

        {/* OCR Result & Operator Confirmation Review (Section 5) */}
        {matchResult && (
          <div className="bg-slate-900/90 border border-cyan-700/60 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                OCR Extracted Attributes
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                Match: {matchResult.matchScore}%
              </span>
            </div>

            {/* Matched Drug info */}
            {matchResult.matchedDrug ? (
              <div className="p-3 bg-[#0d182e] rounded-xl border border-cyan-900/80 space-y-1">
                <div className="text-xs font-bold text-white text-base">
                  {matchResult.matchedDrug.brandName}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  {matchResult.matchedDrug.genericName} • {matchResult.matchedDrug.strength}
                </div>
                <div className="text-[11px] text-cyan-400 font-semibold">
                  List Price: ₹{matchResult.matchedDrug.listPrice.toFixed(2)} • {matchResult.matchedDrug.dosageForm}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>No exact DrugMaster match. Please review or adjust manually.</span>
              </div>
            )}

            {/* Extracted Batch & Expiry Fields */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Batch Detected:</span>
                <span className="font-mono font-bold text-slate-200">
                  {matchResult.extractedFields.batchNumber || 'Not detected'}
                </span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Expiry Date:</span>
                <span className="font-mono font-bold text-slate-200">
                  {matchResult.extractedFields.expiryDate || 'Not detected'}
                </span>
              </div>
            </div>

            {/* Confirmation actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMatchResult(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
              >
                Rescan
              </button>
              <button
                type="button"
                onClick={handleConfirmMatch}
                disabled={!matchResult.matchedDrug}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Populate</span>
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-4 text-xs text-cyan-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processing package OCR & matching catalog...</span>
          </div>
        )}
      </div>
    </div>
  );
};
