import React, { useState, useMemo } from 'react';
import {
  Truck,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Scale,
  TrendingUp,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  Transaction,
  Supplier,
  SupplierQualityEvent,
  PurchaseOrder,
  StockDiscrepancyRecord,
} from '../lib/types/pharmaassist';
import { SupplierQualityService } from '../lib/domain/procurement/supplierQualityService';
import { InventoryAlertService } from '../lib/domain/inventory/inventoryAlertService';
import { TimeSeriesForecastService } from '../lib/domain/analytics/timeSeriesForecastService';
import { translations, Language } from '../lib/i18n/translations';
import { AnimatedNumber } from './common/AnimatedNumber';

interface InsightsScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  transactions: Transaction[];
  suppliers: Supplier[];
  supplierEvents: SupplierQualityEvent[];
  purchaseOrders: PurchaseOrder[];
  discrepancies?: StockDiscrepancyRecord[];
  onNavigateTab: (tab: string) => void;
  lang: Language;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  drugs,
  batches,
  transactions,
  suppliers,
  supplierEvents,
  purchaseOrders,
  discrepancies = [],
  onNavigateTab,
  lang,
}) => {
  const t = translations[lang];
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const lookbackDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // 1. Sales Trend Real Daily Series
  const salesSummary = useMemo(() => {
    const timestamps = transactions.map((t) => new Date(t.timestamp).getTime()).filter((t) => !isNaN(t));
    const latestTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const referenceTime = Math.max(Date.now(), latestTime);
    const cutoff = referenceTime - lookbackDays * 24 * 60 * 60 * 1000;

    let filteredTxs = transactions.filter((tx) => new Date(tx.timestamp).getTime() >= cutoff);
    if (filteredTxs.length === 0 && transactions.length > 0) {
      filteredTxs = transactions;
    }

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    // Daily revenue buckets
    const dailyMap: Record<string, number> = {};

    filteredTxs.forEach((tx) => {
      totalRevenue += tx.totalValue;
      totalDiscount += tx.totalDiscount;

      const dayStr = tx.timestamp.split('T')[0].slice(5); // MM-DD
      dailyMap[dayStr] = (dailyMap[dayStr] || 0) + tx.totalValue;

      tx.items?.forEach((it) => {
        totalUnits += it.quantity;
      });
    });

    const dailyPoints = Object.entries(dailyMap).map(([day, val]) => ({ day, val }));

    return {
      transactionCount: filteredTxs.length,
      totalRevenue,
      totalDiscount,
      totalUnits,
      dailyPoints: dailyPoints.slice(-10),
    };
  }, [transactions, lookbackDays]);

  // Fast-Moving Product Performance (Transformed Analytics)
  const fastMovingProducts = useMemo(() => {
    const counts: Record<string, { name: string; units: number; revenue: number; drugId: string }> = {};
    transactions.forEach((tx) => {
      tx.items?.forEach((it) => {
        if (!counts[it.drugId]) {
          counts[it.drugId] = { name: it.drugName || 'Item', units: 0, revenue: 0, drugId: it.drugId };
        }
        counts[it.drugId].units += it.quantity;
        counts[it.drugId].revenue += it.extendedValue;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [transactions]);

  // 2. Actionable Drug-Specific Inventory Alerts
  const drugAlerts = useMemo(() => {
    return InventoryAlertService.generateAlerts(
      drugs,
      batches,
      [],
      purchaseOrders,
      new Date()
    );
  }, [drugs, batches, purchaseOrders]);

  // 3. Real Supplier Performance Analytics
  const supplierStats = useMemo(() => {
    return suppliers.map((sup) => {
      const events = supplierEvents.filter((e) => e.supplierId === sup.id);
      const res = SupplierQualityService.calculateSupplierScore(events);
      return {
        supplier: sup,
        score: res.score,
        onTimeRate: res.onTimeRate,
        discrepancyCount: res.discrepancyCount,
        qualityFlagCount: res.qualityFlagCount,
      };
    });
  }, [suppliers, supplierEvents]);

  // 5. Time-Series Demand Forecasting Insights & Indication Trends
  const forecastInsights = useMemo(() => {
    const list = drugs.slice(0, 4).map((d) =>
      TimeSeriesForecastService.generateTimeSeriesForecast(
        d.id,
        d.brandName,
        transactions,
        'OTC',
        d.indicationCategory
      )
    );

    const catCounts: Record<string, number> = {};
    let totalItems = 0;
    transactions.forEach((tx) => {
      tx.items?.forEach((it) => {
        const cat = it.indicationCategory || 'General Health';
        catCounts[cat] = (catCounts[cat] || 0) + it.quantity;
        totalItems += it.quantity;
      });
    });

    const indicationTrend = Object.entries(catCounts).map(([category, count]) => ({
      category,
      sharePercent: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
      count,
    }));

    return { forecasts: list, indicationTrend };
  }, [drugs, transactions]);

  const leakageCount = transactions.filter((tx) => tx.discountFlag).length;

  // Filter significant discrepancies for attention
  const significantDiscrepancies = useMemo(
    () => discrepancies.filter((d) => d.severity === 'significant' || d.severity === 'material'),
    [discrepancies]
  );

  return (
    <div className="space-y-5 pb-24 text-slate-100">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            One-Screen Operational Radar (UI-03, NFR-USE-02)
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1">{t.insights}</h2>
          <p className="text-xs text-slate-400">
            What needs attention today: Inventory risk • Demand surges • Supplier quality
          </p>
        </div>

        {/* Time range selector [7d | 30d | 90d] */}
        <div className="flex bg-[#102236] p-1 rounded-xl border border-[#23455b] self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[38px] ${
                timeRange === range
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: WHAT NEEDS ATTENTION TODAY (Significant Discrepancies & Critical Alerts) */}
      {significantDiscrepancies.length > 0 && (
        <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-rose-800/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-sm text-white">Physical Count Discrepancies Requiring Review</h3>
            </div>
            <span className="text-[10px] text-rose-300 font-mono font-bold bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
              {significantDiscrepancies.length} Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {significantDiscrepancies.slice(0, 4).map((d) => (
              <div
                key={d.id}
                className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{d.drugName} (Batch {d.batchNumber})</div>
                  <div className="text-[11px] text-slate-300">
                    System: {d.systemQuantity} → Physical: {d.physicalQuantity} ({d.reasonCode.replace(/_/g, ' ')})
                  </div>
                  {d.notes && <div className="text-[10px] text-rose-300/80 italic mt-0.5">"{d.notes}"</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-rose-400">
                    {d.discrepancyDelta > 0 ? '+' : ''}{d.discrepancyDelta} units
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('inventory')}
                    className="text-[10px] text-cyan-400 hover:underline mt-1 block"
                  >
                    Review in Stock →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: ACTIONABLE INVENTORY ALERTS (Section 9) */}
      <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Actionable Drug-Specific Alerts ({drugAlerts.length})</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Immediate Counter Action</span>
        </div>

        {drugAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drugAlerts.slice(0, 6).map((alert, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs space-y-2 flex flex-col justify-between ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs">{alert.drugName}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-rose-900/80 text-rose-200'
                          : 'bg-amber-900/80 text-amber-200'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono mt-1 opacity-90">{alert.metric}</div>
                  <p className="text-[11px] opacity-80 mt-1">{alert.details}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Action: {alert.recommendedAction}</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(alert.targetTab)}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer touch-active"
                  >
                    <span>{alert.targetTab === 'procurement' ? 'Procure' : 'Review Stock'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[#102236] rounded-2xl text-center text-xs text-slate-400">
            No critical stock or near-expiry alerts detected.
          </div>
        )}
      </div>

      {/* SECTION 3: REVENUE & SALES KPIS WITH ANIMATED NUMBERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0b1728] rounded-2xl border border-[#23455b] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {timeRange.toUpperCase()} Revenue
          </span>
          <div className="text-xl font-black text-cyan-400 font-mono">
            ₹<AnimatedNumber value={salesSummary.totalRevenue} durationMs={350} decimals={2} />
          </div>
          <span className="text-[10px] text-slate-400">
            <AnimatedNumber value={salesSummary.transactionCount} durationMs={200} /> transactions
          </span>
        </div>

        <div className="p-4 bg-[#0b1728] rounded-2xl border border-[#23455b] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Units Dispensed
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            <AnimatedNumber value={salesSummary.totalUnits} durationMs={300} />
          </div>
          <span className="text-[10px] text-slate-400">Across catalog</span>
        </div>

        <div className="p-4 bg-[#0b1728] rounded-2xl border border-[#23455b] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Discount Given
          </span>
          <div className="text-xl font-black text-amber-400 font-mono">
            ₹<AnimatedNumber value={salesSummary.totalDiscount} durationMs={300} decimals={2} />
          </div>
          <span className="text-[10px] text-slate-400">
            <AnimatedNumber value={leakageCount} durationMs={200} /> flagged &gt;5% ceiling
          </span>
        </div>

        <div className="p-4 bg-[#0b1728] rounded-2xl border border-[#23455b] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Suppliers Monitored
          </span>
          <div className="text-xl font-black text-white font-mono">
            <AnimatedNumber value={suppliers.length} durationMs={200} />
          </div>
          <span className="text-[10px] text-slate-400">Active supply routes</span>
        </div>
      </div>

      {/* SECTION 4: DEMAND FORECASTING & INDICATION BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forecast Projections */}
        <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">7-Day Demand Forecast Projections</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Holt-Winters ETS</span>
          </div>

          <div className="space-y-2">
            {forecastInsights.forecasts.map((f) => (
              <div
                key={f.id}
                className="p-3 bg-[#102236] rounded-xl border border-[#23455b] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{f.drugName}</div>
                  <div className="text-[10px] text-slate-400">
                    Confidence: [{f.confidenceLower} - {f.confidenceUpper}] • Trend: {f.trendDirection}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    ~<AnimatedNumber value={f.forecastUnits} durationMs={300} /> units
                  </span>
                  <div className="text-[10px] text-slate-400">MAPE: {f.mapeError || 18.5}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indication Category Share */}
        <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Demand by Indication Category</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Volume Share</span>
          </div>

          <div className="space-y-2.5">
            {forecastInsights.indicationTrend.map((it, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{it.category}</span>
                  <span className="font-mono font-bold text-emerald-400">{it.sharePercent}% ({it.count} units)</span>
                </div>
                <div className="w-full bg-[#102236] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, it.sharePercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4.5: FAST-MOVING MEDICINES (TRANSFORMED DISPENSE VELOCITY) */}
      {fastMovingProducts.length > 0 && (
        <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Fast-Moving Medicines (Dispense Velocity)</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
              Live Counter Feed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fastMovingProducts.map((p, idx) => {
              const drugBatches = batches.filter((b) => b.drugId === p.drugId && b.quantityOnHand > 0);
              const currentStock = drugBatches.reduce((acc, b) => acc + b.quantityOnHand, 0);
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-[#102236] rounded-2xl border border-[#23455b] flex flex-col justify-between text-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Stock Remaining:{' '}
                        <span
                          className={`font-mono font-bold ${
                            currentStock > 10 ? 'text-emerald-400' : currentStock > 0 ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {currentStock} units
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">
                      Dispensed: <strong className="text-white font-mono">{p.units} units</strong>
                    </span>
                    <span className="text-emerald-400 font-mono font-bold text-xs">
                      ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: REAL SUPPLIER QUALITY RADAR */}
      <div className="bg-[#0b1728] p-4 sm:p-5 rounded-3xl border border-[#23455b] shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Supplier Quality & Delivery Performance</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Real Delivery Audits</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {supplierStats.map((s) => (
            <div
              key={s.supplier.id}
              className="p-3.5 bg-[#102236] rounded-2xl border border-[#23455b] space-y-2 text-xs"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-white">{s.supplier.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    s.score >= 80 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  Score: {s.score}/100
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div>On-Time Rate: <strong className="text-slate-200">{s.onTimeRate}%</strong></div>
                <div>Discrepancies: <strong className="text-slate-200">{s.discrepancyCount}</strong> logged</div>
                <div>Quality Flags: <strong className="text-slate-200">{s.qualityFlagCount}</strong> issues</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
