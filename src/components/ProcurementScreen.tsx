import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Truck,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  UnmetDemand,
  Supplier,
  PurchaseOrder,
  DemandForecast,
  ProcurementRecommendation,
} from '../lib/types/pharmaassist';
import { ProcurementService } from '../lib/domain/procurement/procurementService';
import { translations, Language } from '../lib/i18n/translations';

interface ProcurementScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  unmetDemands: UnmetDemand[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  forecasts?: DemandForecast[];
  onCreatePO: (supplierId: string, items: { drugId: string; quantity: number }[]) => void;
  onReceivePO: (
    poId: string,
    receivedItems: {
      drugId: string;
      batchNumber: string;
      lotNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      receivedQuantity: number;
    }[],
    onTime: boolean,
    qualityFlag: 'none' | 'damaged' | 'expired_on_arrival' | 'rejected_batch'
  ) => void;
  lang: Language;
}

export const ProcurementScreen: React.FC<ProcurementScreenProps> = ({
  drugs,
  batches,
  unmetDemands,
  suppliers,
  purchaseOrders,
  forecasts = [],
  onCreatePO,
  onReceivePO,
  lang,
}) => {
  const t = translations[lang];

  // Selected drug for quick PO modal
  const [quickPOModalDrug, setQuickPOModalDrug] = useState<ProcurementRecommendation | null>(null);
  const [orderQty, setOrderQty] = useState<number>(50);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Selected PO for receipt modal
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receivedBatchNumber, setReceivedBatchNumber] = useState('');
  const [receivedExpiry, setReceivedExpiry] = useState('');
  const [receivedQty, setReceivedQty] = useState(0);
  const [isOnTime, setIsOnTime] = useState(true);
  const [qualityFlag, setQualityFlag] = useState<'none' | 'damaged' | 'expired_on_arrival' | 'rejected_batch'>('none');

  // Compute recommendations with forecasts and on-order deduplication
  const recommendations = useMemo(() => {
    return ProcurementService.generateRecommendations(
      drugs,
      batches,
      unmetDemands,
      forecasts,
      suppliers,
      purchaseOrders
    );
  }, [drugs, batches, unmetDemands, forecasts, suppliers, purchaseOrders]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPOModalDrug || !selectedSupplierId) return;

    onCreatePO(selectedSupplierId, [{ drugId: quickPOModalDrug.drugId, quantity: orderQty }]);
    setQuickPOModalDrug(null);
  };

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPO) return;

    const item = receivingPO.items?.[0];
    if (!item) return;

    onReceivePO(
      receivingPO.id,
      [
        {
          drugId: item.drugId,
          batchNumber: receivedBatchNumber || `BAT-${Date.now().toString().slice(-4)}`,
          lotNumber: `LOT-${Date.now().toString().slice(-4)}`,
          manufacturingDate: new Date().toISOString().split('T')[0],
          expiryDate: receivedExpiry || '2028-12-31',
          receivedQuantity: receivedQty || item.orderedQuantity,
        },
      ],
      isOnTime,
      qualityFlag
    );

    setReceivingPO(null);
  };

  return (
    <div className="space-y-6 pb-20 text-slate-100">
      {/* Header Banner */}
      <div className="bg-[#0f172a] p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Intelligent Supply Chain (FR-PROC-01..05)
          </span>
          <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
            <span>{t.procurement}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
              {recommendations.length} Pending Actions
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ranked procurement recommendations derived from live stock, unmet demand signals, and time-series forecasts.
          </p>
        </div>
      </div>

      {/* Quick PO Creation Modal */}
      {quickPOModalDrug && (
        <form
          onSubmit={handleCreateOrder}
          className="bg-[#0f172a] border-2 border-cyan-500/40 p-5 rounded-3xl space-y-4 shadow-2xl animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              <span>Issue Purchase Order for <span className="text-cyan-300">{quickPOModalDrug.drugName}</span></span>
            </h3>
            <button
              type="button"
              onClick={() => setQuickPOModalDrug(null)}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>

          {quickPOModalDrug.explanation && (
            <div className="flex items-start gap-2 p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-cyan-200">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{quickPOModalDrug.explanation}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Supplier:</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-cyan-500 focus:outline-hidden"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Promised Lead Time: {s.promisedLeadTimeDays}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Order Quantity (Units):</label>
              <input
                type="number"
                min="10"
                value={orderQty}
                onChange={(e) => setOrderQty(parseInt(e.target.value) || 10)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-100 font-bold rounded-xl focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickPOModalDrug(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSupplierId}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-900/30 cursor-pointer"
            >
              Confirm & Issue PO
            </button>
          </div>
        </form>
      )}

      {/* Receive PO Modal */}
      {receivingPO && (
        <form
          onSubmit={handleConfirmReceipt}
          className="bg-[#0f172a] border-2 border-emerald-500/40 p-5 rounded-3xl space-y-4 shadow-2xl animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>Receive Shipment for Order #{receivingPO.id.slice(-6)}</span>
            </h3>
            <button
              type="button"
              onClick={() => setReceivingPO(null)}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Batch / Lot Number:</label>
              <input
                type="text"
                required
                value={receivedBatchNumber}
                onChange={(e) => setReceivedBatchNumber(e.target.value)}
                placeholder="e.g. BAT-2026-X"
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Expiry Date:</label>
              <input
                type="date"
                required
                value={receivedExpiry}
                onChange={(e) => setReceivedExpiry(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Received Quantity:</label>
              <input
                type="number"
                min="1"
                value={receivedQty || receivingPO.items?.[0]?.orderedQuantity || 50}
                onChange={(e) => setReceivedQty(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="onTimeCheck"
                checked={isOnTime}
                onChange={(e) => setIsOnTime(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-800 border-slate-700 focus:ring-0"
              />
              <label htmlFor="onTimeCheck" className="text-slate-200 font-semibold cursor-pointer">
                Delivery arrived on time within promised lead time
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Quality Inspection Flag:</label>
              <select
                value={qualityFlag}
                onChange={(e) => setQualityFlag(e.target.value as any)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="none">None (Passed Quality Inspection)</option>
                <option value="damaged">Damaged Outer Cartons</option>
                <option value="expired_on_arrival">Expired on Arrival</option>
                <option value="rejected_batch">Rejected Batch</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReceivingPO(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              Verify Receipt & Stock In
            </button>
          </div>
        </form>
      )}

      {/* 1. Ranked Procurement Recommendations */}
      <div className="bg-[#0f172a] rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              Ranked Reorder Recommendations (FR-PROC-01)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Stock Velocity + Forecast Deduplicated</span>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.drugId}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition space-y-3 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-sm">{rec.drugName}</span>
                      <div className="text-[11px] text-slate-400">{rec.genericName}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Priority: {rec.priorityScore}
                    </span>
                  </div>

                  <div className="mt-3 text-slate-300 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Stock:</span>
                      <strong className={rec.currentStock <= rec.reorderThreshold ? 'text-rose-400' : 'text-slate-200'}>
                        {rec.currentStock} / {rec.reorderThreshold}
                      </strong>
                    </div>

                    {rec.onOrderQuantity > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>Already On Order:</span>
                        <span className="font-semibold">{rec.onOrderQuantity} units</span>
                      </div>
                    )}

                    {rec.unmetDemandCount > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Unmet Customer Logs:</span>
                        <span className="font-semibold">{rec.unmetDemandCount} requests</span>
                      </div>
                    )}

                    {rec.daysToStockout !== undefined && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> Days to Stockout:
                        </span>
                        <span className={`font-mono font-bold ${rec.daysToStockout <= 3 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {rec.daysToStockout === 0 ? 'Depleted' : `~${rec.daysToStockout}d`}
                        </span>
                      </div>
                    )}

                    <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                      Supplier: <span className="text-slate-300">{rec.preferredSupplier?.name || 'Preferred supplier'}</span>
                    </div>

                    {rec.explanation && (
                      <div className="text-[10px] text-slate-400 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                        "{rec.explanation}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    Order ~{rec.recommendedOrderQuantity} units
                  </span>
                  <button
                    onClick={() => {
                      setQuickPOModalDrug(rec);
                      setOrderQty(rec.recommendedOrderQuantity);
                      setSelectedSupplierId(rec.preferredSupplier?.id || suppliers[0]?.id || '');
                    }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <span>Create PO</span> <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-slate-900/50 rounded-2xl text-center text-xs text-slate-400 border border-slate-800/60 flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span>All inventory items are currently above safety thresholds and covered by on-order quantities.</span>
          </div>
        )}
      </div>

      {/* 2. Purchase Orders Log */}
      <div className="bg-[#0f172a] rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Purchase Orders & Receipt Tracking</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Total: {purchaseOrders.length}</span>
        </div>

        {purchaseOrders.length > 0 ? (
          <div className="space-y-2 text-xs">
            {purchaseOrders.map((po) => {
              const supplier = suppliers.find((s) => s.id === po.supplierId);
              const isReceived = po.status === 'received';

              return (
                <div
                  key={po.id}
                  className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>Order #{po.id.slice(-6)}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-semibold ${
                          isReceived
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Supplier: <span className="text-slate-300 font-medium">{supplier?.name || po.supplierName}</span> • Date: {new Date(po.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReceived && (
                      <button
                        onClick={() => {
                          setReceivingPO(po);
                          setReceivedQty(po.items?.[0]?.orderedQuantity || 50);
                          setReceivedBatchNumber(`BAT-${Date.now().toString().slice(-4)}`);
                          setReceivedExpiry('2028-12-31');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Stock In (Receipt)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-slate-900/50 rounded-2xl text-center text-xs text-slate-400 border border-slate-800/60">
            No active purchase orders. Click "Create PO" on any recommendation above.
          </div>
        )}
      </div>
    </div>
  );
};
