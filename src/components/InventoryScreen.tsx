import React, { useState } from 'react';
import {
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { DrugMaster, StockBatch, StockAdjustmentReason } from '../lib/types/pharmaassist';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { translations, Language } from '../lib/i18n/translations';

interface InventoryScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  onApplyAdjustment: (
    batchId: string,
    delta: number,
    reason: StockAdjustmentReason,
    notes?: string
  ) => void;
  lang: Language;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  drugs,
  batches,
  onApplyAdjustment,
  lang,
}) => {
  const t = translations[lang];
  const [selectedBatchForAdj, setSelectedBatchForAdj] = useState<StockBatch | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState<StockAdjustmentReason>('physical_count_correction');
  const [notes, setNotes] = useState('');

  const handleExportCSV = () => {
    // Generate CSV data for Drug Master and Stock Ledger (SW-01)
    const headers = 'DrugName,GenericName,BatchNumber,LotNumber,ExpiryDate,QuantityOnHand\n';
    const rows = batches
      .map((b) => {
        const drug = drugs.find((d) => d.id === b.drugId);
        return `"${drug?.brandName || ''}","${drug?.genericName || ''}","${b.batchNumber}","${b.lotNumber}","${b.expiryDate}",${b.quantityOnHand}`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaassist_stock_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForAdj || deltaQty === 0) return;

    onApplyAdjustment(selectedBatchForAdj.id, deltaQty, reasonCode, notes);
    setSelectedBatchForAdj(null);
    setDeltaQty(0);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-20 text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            Authoritative Stock Ledger (FR-INV-01)
          </span>
          <h2 className="text-xl font-black text-white mt-1">{t.inventory}</h2>
          <p className="text-xs text-slate-400">
            Batches, manufacturing dates, expiry dates, and reason-coded adjustments
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-2xl text-xs font-semibold border border-slate-800 transition cursor-pointer self-start sm:self-auto min-h-[44px]"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Ledger CSV (SW-01)</span>
        </button>
      </div>

      {/* Adjustment Modal / Drawer */}
      {selectedBatchForAdj && (
        <form
          onSubmit={handleSaveAdjustment}
          className="bg-cyan-950/30 border-2 border-cyan-700/80 p-5 rounded-3xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Stock Adjustment with Reason Code (FR-INV-04)</span>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedBatchForAdj(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Batch Selected:</span>
              <div className="font-bold text-white bg-[#070d1a] p-2.5 rounded-xl border border-slate-800">
                {selectedBatchForAdj.batchNumber} (Current: {selectedBatchForAdj.quantityOnHand} units)
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Adjustment Delta (+/- Quantity):
              </label>
              <input
                type="number"
                required
                value={deltaQty}
                onChange={(e) => setDeltaQty(parseInt(e.target.value) || 0)}
                placeholder="e.g. -5 or +10"
                className="w-full p-2.5 bg-[#070d1a] border border-slate-700 rounded-xl font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Mandatory Reason Code:
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as StockAdjustmentReason)}
                className="w-full p-2.5 bg-[#070d1a] border border-slate-700 rounded-xl font-medium text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="physical_count_correction">Physical Count Correction</option>
                <option value="damage">Damaged Packaging</option>
                <option value="expiry_write_off">Expiry Write-Off</option>
                <option value="other">Other Operational Discrepancy</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={deltaQty === 0}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer min-h-[44px]"
            >
              Commit Stock Adjustment
            </button>
          </div>
        </form>
      )}

      {/* Batches Table */}
      <div className="bg-[#0b1329] rounded-3xl border border-slate-800 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070d1a] border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Medicine & Indication</th>
                <th className="py-3 px-4">Batch / Lot</th>
                <th className="py-3 px-4">Mfg / Expiry</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4">Shelf Life Status</th>
                <th className="py-3 px-4 text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {batches.map((batch) => {
                const drug = drugs.find((d) => d.id === batch.drugId);
                const isNearExpiry = NearExpiryService.isNearExpiry(batch, 90);
                const isExpired = NearExpiryService.isExpired(batch);
                const daysLeft = NearExpiryService.getDaysToExpiry(batch);

                return (
                  <tr key={batch.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{drug?.brandName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {drug?.genericName} • {drug?.strength}
                      </div>
                      {drug?.indicationCategory && (
                        <span className="text-[10px] text-cyan-400 font-medium">
                          {drug.indicationCategory}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-200">{batch.batchNumber}</span>
                      <span className="text-[10px] text-slate-500 block">{batch.lotNumber}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>Mfg: {batch.manufacturingDate}</div>
                      <div className="font-semibold text-white">Exp: {batch.expiryDate}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-base font-extrabold text-white">
                        {batch.quantityOnHand}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Threshold: {batch.reorderThreshold}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <AlertTriangle className="w-3 h-3" /> Expired (Wastage)
                        </span>
                      ) : isNearExpiry ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                          <Clock className="w-3 h-3" /> Near Expiry ({daysLeft}d left)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Safe Shelf Life
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedBatchForAdj(batch)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-cyan-300 border border-slate-700 font-semibold text-xs transition cursor-pointer"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
