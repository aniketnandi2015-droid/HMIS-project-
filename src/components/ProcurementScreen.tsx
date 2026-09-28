import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Truck,
  Sparkles,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  UnmetDemand,
  Supplier,
  PurchaseOrder,
} from '../lib/types/pharmaassist';
import { ProcurementService } from '../lib/domain/procurement/procurementService';
import { translations, Language } from '../lib/i18n/translations';

interface ProcurementScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  unmetDemands: UnmetDemand[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
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
  onCreatePO,
  onReceivePO,
  lang,
}) => {
  const t = translations[lang];

  // Selected drug for quick PO modal
  const [quickPOModalDrug, setQuickPOModalDrug] = useState<any | null>(null);
  const [orderQty, setOrderQty] = useState<number>(50);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Selected PO for receipt modal
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receivedBatchNumber, setReceivedBatchNumber] = useState('');
  const [receivedExpiry, setReceivedExpiry] = useState('');
  const [receivedQty, setReceivedQty] = useState(0);
  const [isOnTime, setIsOnTime] = useState(true);
  const [qualityFlag, setQualityFlag] = useState<'none' | 'damaged' | 'expired_on_arrival' | 'rejected_batch'>('none');

  // Compute recommendations
  const recommendations = useMemo(() => {
    return ProcurementService.generateRecommendations(
      drugs,
      batches,
      unmetDemands,
      [],
      suppliers
    );
  }, [drugs, batches, unmetDemands, suppliers]);

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
    <div className="space-y-6 pb-20">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            Intelligent Supply Chain (FR-PROC-01..05)
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">{t.procurement}</h2>
          <p className="text-xs text-slate-500">
            Ranked reorders from low-stock, customer demand logs, and lead-time history
          </p>
        </div>
      </div>

      {/* Quick PO Creation Modal */}
      {quickPOModalDrug && (
        <form
          onSubmit={handleCreateOrder}
          className="bg-blue-50 border-2 border-blue-300 p-5 rounded-3xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span>Issue Purchase Order for {quickPOModalDrug.drugName}</span>
            </h3>
            <button
              type="button"
              onClick={() => setQuickPOModalDrug(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Supplier:</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Lead Time: {s.promisedLeadTimeDays}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Order Quantity:</label>
              <input
                type="number"
                min="10"
                value={orderQty}
                onChange={(e) => setOrderQty(parseInt(e.target.value) || 10)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={!selectedSupplierId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Confirm & Send PO
            </button>
          </div>
        </form>
      )}

      {/* Receive PO Modal */}
      {receivingPO && (
        <form
          onSubmit={handleConfirmReceipt}
          className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-3xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>Receive Shipment for Order {receivingPO.id}</span>
            </h3>
            <button
              type="button"
              onClick={() => setReceivingPO(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Received Batch Number:</label>
              <input
                type="text"
                required
                value={receivedBatchNumber}
                onChange={(e) => setReceivedBatchNumber(e.target.value)}
                placeholder="e.g. BAT-2026-X"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date:</label>
              <input
                type="date"
                required
                value={receivedExpiry}
                onChange={(e) => setReceivedExpiry(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Actual Received Quantity:</label>
              <input
                type="number"
                min="1"
                value={receivedQty || receivingPO.items?.[0]?.orderedQuantity || 50}
                onChange={(e) => setReceivedQty(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="onTimeCheck"
                checked={isOnTime}
                onChange={(e) => setIsOnTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="onTimeCheck" className="text-slate-700 font-semibold cursor-pointer">
                Delivery arrived on time within promised lead time
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quality Inspection Flag:</label>
              <select
                value={qualityFlag}
                onChange={(e) => setQualityFlag(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
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
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Verify Receipt & Increment Stock
            </button>
          </div>
        </form>
      )}

      {/* 1. Ranked Procurement Recommendations */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">
              Ranked Reorder Recommendations (FR-PROC-01)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Low Stock + Unmet Demand Signals</span>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((rec) => (
              <div
                key={rec.drugId}
                className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2 text-xs"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 text-sm">{rec.drugName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Priority: {rec.priorityScore}
                  </span>
                </div>

                <div className="text-slate-600 space-y-0.5 text-[11px]">
                  <div>Current Stock: <strong className="text-rose-600">{rec.currentStock}</strong> / {rec.reorderThreshold}</div>
                  {rec.unmetDemandCount > 0 && (
                    <div className="text-amber-800 font-semibold">
                      Unfulfilled Demands: {rec.unmetDemandCount} logged
                    </div>
                  )}
                  <div>Supplier: {rec.preferredSupplier?.name || 'Any registered supplier'}</div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">
                    Order ~{rec.recommendedOrderQuantity} units
                  </span>
                  <button
                    onClick={() => {
                      setQuickPOModalDrug(rec);
                      setOrderQty(rec.recommendedOrderQuantity);
                      setSelectedSupplierId(rec.preferredSupplier?.id || suppliers[0]?.id || '');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Create PO</span> <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
            All inventory levels are currently above reorder thresholds.
          </div>
        )}
      </div>

      {/* 2. Purchase Orders Log */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Purchase Orders & Receipt Status</h3>
          </div>
          <span className="text-[11px] text-slate-400">Total: {purchaseOrders.length}</span>
        </div>

        {purchaseOrders.length > 0 ? (
          <div className="space-y-2 text-xs">
            {purchaseOrders.map((po) => {
              const supplier = suppliers.find((s) => s.id === po.supplierId);
              const isReceived = po.status === 'received';

              return (
                <div
                  key={po.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span>Order #{po.id.slice(-6)}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${
                          isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Supplier: {supplier?.name || po.supplierName} • Created: {new Date(po.createdAt).toLocaleDateString()}
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
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
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
          <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
            No active purchase orders. Click "Create PO" on any recommendation above.
          </div>
        )}
      </div>
    </div>
  );
};
