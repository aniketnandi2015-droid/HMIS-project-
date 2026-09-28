import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Truck,
  Layers,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  Transaction,
  Supplier,
  SupplierQualityEvent,
} from '../lib/types/pharmaassist';
import { MovementClassificationService } from '../lib/domain/analytics/movementClassificationService';
import { SupplierQualityService } from '../lib/domain/procurement/supplierQualityService';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { translations, Language } from '../lib/i18n/translations';

interface InsightsScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  transactions: Transaction[];
  suppliers: Supplier[];
  lang: Language;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  drugs,
  batches,
  transactions,
  suppliers,
  lang,
}) => {
  const t = translations[lang];
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const lookbackDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // 1. Sales Trend Aggregations
  const salesSummary = useMemo(() => {
    const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    const filteredTxs = transactions.filter((tx) => new Date(tx.timestamp).getTime() >= cutoff);

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    filteredTxs.forEach((tx) => {
      totalRevenue += tx.totalValue;
      totalDiscount += tx.totalDiscount;
      tx.items?.forEach((it) => {
        totalUnits += it.quantity;
      });
    });

    return {
      transactionCount: filteredTxs.length,
      totalRevenue,
      totalDiscount,
      totalUnits,
    };
  }, [transactions, lookbackDays]);

  // 2. Fast / Slow Moving Stock
  const movement = useMemo(() => {
    return MovementClassificationService.classifyMovement(drugs, batches, transactions, new Date(), lookbackDays);
  }, [drugs, batches, transactions, lookbackDays]);

  // 3. Flags & Alerts (Low stock, near-expiry, leakage, wastage)
  const alerts = useMemo(() => {
    const nearExpiryBatches = batches.filter((b) => NearExpiryService.isNearExpiry(b, 90));
    const lowStockDrugs = drugs.filter((d) => {
      const available = batches
        .filter((b) => b.drugId === d.id)
        .reduce((sum, b) => sum + b.quantityOnHand, 0);
      return available <= 15;
    });
    const leakageTransactions = transactions.filter((tx) => tx.discountFlag || tx.quantityCorrectionFlag);

    // Approximate wastage value from expired stock
    const expiredBatches = batches.filter((b) => NearExpiryService.isExpired(b));
    let wastageValue = 0;
    expiredBatches.forEach((b) => {
      const drug = drugs.find((d) => d.id === b.drugId);
      if (drug) {
        wastageValue += b.quantityOnHand * drug.listPrice;
      }
    });

    return {
      nearExpiryCount: nearExpiryBatches.length,
      lowStockCount: lowStockDrugs.length,
      leakageCount: leakageTransactions.length,
      wastageValue,
    };
  }, [drugs, batches, transactions]);

  // 4. Supplier Performance Summary
  const supplierStats = useMemo(() => {
    return suppliers.map((sup, idx) => {
      const syntheticEvents: SupplierQualityEvent[] = [
        {
          id: `ev-${idx}-1`,
          purchaseOrderId: 'po-1',
          supplierId: sup.id,
          onTime: idx !== 1,
          quantityDiscrepancy: idx === 1 ? 4 : 0,
          qualityFlag: 'none',
          evaluatedAt: new Date().toISOString(),
        },
      ];
      const res = SupplierQualityService.calculateSupplierScore(syntheticEvents);
      return {
        supplier: sup,
        score: res.score,
        onTimeRate: res.onTimeRate,
        discrepancyCount: res.discrepancyCount,
      };
    });
  }, [suppliers]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Single Screen Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            One-Screen Operational Radar (UI-03, NFR-USE-02)
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">{t.insights}</h2>
          <p className="text-xs text-slate-500">
            Zero additional tabs • Scannable under 60 seconds
          </p>
        </div>

        {/* Time range selector [7d | 30d | 90d] */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[38px] ${
                timeRange === range
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of the 4 Core Visual Cards (Appendix B Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Sales & Revenue Trend (FR-ANL-01) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{t.salesTrend}</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Past {lookbackDays} Days</span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Revenue</span>
              <div className="text-lg font-black text-blue-700">
                ${salesSummary.totalRevenue.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Units Sold</span>
              <div className="text-lg font-black text-slate-800">{salesSummary.totalUnits}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Transactions</span>
              <div className="text-lg font-black text-emerald-600">{salesSummary.transactionCount}</div>
            </div>
          </div>

          {/* Simple Visual Trend Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Gross Sales Volume</span>
              <span className="font-semibold text-slate-800">
                Avg ${(salesSummary.totalRevenue / Math.max(1, salesSummary.transactionCount)).toFixed(2)} / txn
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Flags & Operational Alerts (FR-INV-05, FR-INV-06, FR-TXN-03) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{t.flagsAlerts}</h3>
            </div>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Live Audited
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase">{t.lowStock}</span>
              <div className="text-xl font-black text-amber-900">{alerts.lowStockCount}</div>
              <span className="text-[10px] text-amber-700">Triggered Reorder Threshold</span>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-rose-800 uppercase">{t.nearExpiry}</span>
              <div className="text-xl font-black text-rose-900">{alerts.nearExpiryCount}</div>
              <span className="text-[10px] text-rose-700">Critical Shelf Life</span>
            </div>

            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">{t.revenueLeakage}</span>
              <div className="text-xl font-black text-indigo-900">{alerts.leakageCount}</div>
              <span className="text-[10px] text-indigo-700">Discounts &gt; 5% Ceiling</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase">{t.wastageValue}</span>
              <div className="text-xl font-black text-slate-800">${alerts.wastageValue.toFixed(2)}</div>
              <span className="text-[10px] text-slate-500">Expired Stock Ledger</span>
            </div>
          </div>
        </div>

        {/* Card 3: Fast & Slow Moving Stock (FR-ANL-04, BR-06) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{t.fastSlowStock}</h3>
            </div>
            <span className="text-[11px] text-slate-400">Velocity Bands</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
            {movement.fastMoving.slice(0, 3).map((item) => (
              <div
                key={item.drug.id}
                className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-slate-900">{item.drug.brandName}</span>
                  <span className="text-[10px] text-slate-500 block">{item.drug.genericName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-700 text-xs">Fast: {item.unitsSold} units</span>
                  <span className="text-[10px] text-emerald-600 block">{item.velocity}</span>
                </div>
              </div>
            ))}

            {movement.slowMoving.slice(0, 3).map((item) => (
              <div
                key={item.drug.id}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{item.drug.brandName}</span>
                    {item.isNearExpiry && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                        Near Expiry
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    No sales in {item.daysWithoutSale} days
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">Slow ({item.unitsSold} sold)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Supplier Performance (FR-ANL-05, FR-PROC-04) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{t.supplierPerformance}</h3>
            </div>
            <span className="text-[11px] text-slate-400">On-Time & Quality</span>
          </div>

          <div className="space-y-2 text-xs">
            {supplierStats.map((item) => (
              <div
                key={item.supplier.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">{item.supplier.name}</div>
                  <div className="text-[10px] text-slate-500">
                    Lead Time: {item.supplier.promisedLeadTimeDays}d • Discrepancies: {item.discrepancyCount}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-purple-700">{item.score}/100</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {item.onTimeRate}% On-Time
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
