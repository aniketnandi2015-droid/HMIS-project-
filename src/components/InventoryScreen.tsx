import React, { useState } from 'react';
import {
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sliders,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  StockAdjustmentReason,
  StockDiscrepancyRecord,
} from '../lib/types/pharmaassist';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { Language } from '../lib/i18n/translations';
import { AnimatedNumber } from './common/AnimatedNumber';

interface InventoryScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  discrepancies?: StockDiscrepancyRecord[];
  onOpenDiscrepancyModal?: (batchId?: string) => void;
  onApplyAdjustment: (
    batchId: string,
    delta: number,
    reason: StockAdjustmentReason,
    notes?: string
  ) => void;
  lang?: Language;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  drugs,
  batches,
  discrepancies = [],
  onOpenDiscrepancyModal,
  onApplyAdjustment,
}) => {
  const [selectedBatchForAdj, setSelectedBatchForAdj] = useState<StockBatch | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState<StockAdjustmentReason>('physical_count_correction');
  const [notes, setNotes] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  const handleExportCSV = () => {
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

  // Filter batches by medicine brand or batch number
  const filteredBatches = batches.filter((b) => {
    const drug = drugs.find((d) => d.id === b.drugId);
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      drug?.brandName.toLowerCase().includes(q) ||
      drug?.genericName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 pb-24 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Authoritative Stock Ledger (FR-INV-01)
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1">Stock & Physical Verification</h2>
          <p className="text-xs text-slate-400">
            Track batch FEFO dates, log count discrepancies, and apply reason-coded adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenDiscrepancyModal && (
            <button
              type="button"
              onClick={() => onOpenDiscrepancyModal()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-amber-950 touch-active min-h-[44px]"
            >
              <Scale className="w-4 h-4 text-amber-200" />
              <span>Count Discrepancy</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[#102236] hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-semibold border border-[#23455b] transition cursor-pointer touch-active min-h-[44px]"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-[#0b1728] p-3 rounded-2xl border border-[#23455b]">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter stock by medicine name or batch number..."
          className="w-full px-3 py-2 bg-[#102236] border border-[#23455b] rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden"
        />
      </div>

      {/* Manual Quick Adjustment Form if open */}
      {selectedBatchForAdj && (
        <form
          onSubmit={handleSaveAdjustment}
          className="bg-[#102236] border-2 border-cyan-500/50 p-4 rounded-3xl space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
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
              <div className="font-bold text-white bg-[#0b1728] p-2.5 rounded-xl border border-[#23455b] font-mono">
                {selectedBatchForAdj.batchNumber} (Current: {selectedBatchForAdj.quantityOnHand} units)
              </div>
            </div>

            <div>
              <label htmlFor="delta-qty-input" className="text-slate-300 font-semibold block mb-1">
                Adjustment Delta (+/- Units):
              </label>
              <input
                id="delta-qty-input"
                type="number"
                value={deltaQty}
                onChange={(e) => setDeltaQty(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-white font-mono font-bold focus:border-cyan-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="reason-code-select" className="text-slate-300 font-semibold block mb-1">Reason Code:</label>
              <select
                id="reason-code-select"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as StockAdjustmentReason)}
                className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-white focus:border-cyan-400 focus:outline-hidden"
              >
                <option value="physical_count_correction">Physical count correction</option>
                <option value="damage">Damage / breakage</option>
                <option value="expiry_write_off">Expired stock write-off</option>
                <option value="other">Other reason</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="adjustment-notes-input" className="text-slate-400 block mb-1 text-xs">Audit Notes (Optional):</label>
            <input
              id="adjustment-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken ampoule during storage"
              className="w-full p-2.5 bg-[#0b1728] border border-[#23455b] rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedBatchForAdj(null)}
              className="px-4 py-2 bg-[#0b1728] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deltaQty === 0}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-md touch-active cursor-pointer"
            >
              Commit Adjustment
            </button>
          </div>
        </form>
      )}

      {/* Mobile Stacked Batch Cards (Section 12 & 29.5) */}
      <div className="space-y-3">
        {filteredBatches.map((batch) => {
          const drug = drugs.find((d) => d.id === batch.drugId);
          const isNear = NearExpiryService.isNearExpiry(batch, 90);
          const daysLeft = NearExpiryService.getDaysToExpiry(batch);
          const isLow = batch.quantityOnHand <= batch.reorderThreshold;

          return (
            <div
              key={batch.id}
              className="p-4 rounded-2xl bg-[#0b1728] border border-[#23455b] hover:border-slate-600 transition space-y-3 text-xs"
            >
              {/* Medicine Brand & Quantity Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{drug?.brandName || 'Medicine'}</h3>
                  <div className="text-[11px] text-slate-400">
                    {drug?.genericName} • {drug?.strength} • {drug?.dosageForm}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-cyan-300 font-mono">
                    <AnimatedNumber value={batch.quantityOnHand} durationMs={250} /> units
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Threshold: {batch.reorderThreshold}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {isLow && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Low Stock</span>
                  </span>
                )}
                {isNear && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Near Expiry ({daysLeft}d left)</span>
                  </span>
                )}
                {!isLow && !isNear && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Healthy Stock</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-[#102236] text-slate-300 font-mono text-[10px] border border-[#23455b]">
                  Batch {batch.batchNumber}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Exp: {batch.expiryDate}
                </span>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 border-t border-[#23455b]/60 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  v{batch.stockVersion} • {new Date(batch.lastUpdatedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {onOpenDiscrepancyModal && (
                    <button
                      type="button"
                      onClick={() => onOpenDiscrepancyModal(batch.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer touch-active min-h-[38px]"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Reconcile Count</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBatchForAdj(batch);
                      setDeltaQty(0);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#102236] hover:bg-slate-700 text-slate-200 border border-[#23455b] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer touch-active min-h-[38px]"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Adjust</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discrepancy Reconciliation Audit Log */}
      {discrepancies.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1728] border border-[#23455b] space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Physical Count Discrepancy Audits</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{discrepancies.length} logged</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                className="p-3 rounded-xl bg-[#102236] border border-[#23455b] text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{disc.drugName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({disc.batchNumber})</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    System: {disc.systemQuantity} → Count: {disc.physicalQuantity} • Reason: {disc.reasonCode.replace(/_/g, ' ')}
                  </div>
                  {disc.notes && <div className="text-[10px] text-slate-400 italic">"{disc.notes}"</div>}
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-xs ${
                      disc.direction === 'shortage' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {disc.discrepancyDelta > 0 ? '+' : ''}{disc.discrepancyDelta} units
                  </span>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {disc.severity} ({disc.discrepancyPercent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
