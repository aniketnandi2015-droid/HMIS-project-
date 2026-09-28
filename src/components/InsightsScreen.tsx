import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Truck,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  Transaction,
  Supplier,
  SupplierQualityEvent,
  PurchaseOrder,
} from '../lib/types/pharmaassist';
import { MovementClassificationService } from '../lib/domain/analytics/movementClassificationService';
import { SupplierQualityService } from '../lib/domain/procurement/supplierQualityService';
import { InventoryAlertService } from '../lib/domain/inventory/inventoryAlertService';
import { TimeSeriesForecastService } from '../lib/domain/analytics/timeSeriesForecastService';
import { translations, Language } from '../lib/i18n/translations';

interface InsightsScreenProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  transactions: Transaction[];
  suppliers: Supplier[];
  supplierEvents: SupplierQualityEvent[];
  purchaseOrders: PurchaseOrder[];
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
  onNavigateTab,
  lang,
}) => {
  const t = translations[lang];
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const lookbackDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // 1. Sales Trend Real Daily Series
  const salesSummary = useMemo(() => {
    const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    const filteredTxs = transactions.filter((tx) => new Date(tx.timestamp).getTime() >= cutoff);

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

  // 2. Actionable Drug-Specific Inventory Alerts (Section 9)
  const drugAlerts = useMemo(() => {
    return InventoryAlertService.generateAlerts(
      drugs,
      batches,
      [],
      purchaseOrders,
      new Date()
    );
  }, [drugs, batches, purchaseOrders]);

  // 3. Fast / Slow Moving Stock
  const movement = useMemo(() => {
    return MovementClassificationService.classifyMovement(drugs, batches, transactions, new Date(), lookbackDays);
  }, [drugs, batches, transactions, lookbackDays]);

  // 4. Real Supplier Performance Analytics (Section 3.E & 10)
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
    // Generate forecast for top active drugs
    const list = drugs.slice(0, 4).map((d) =>
      TimeSeriesForecastService.generateTimeSeriesForecast(
        d.id,
        d.brandName,
        transactions,
        'OTC',
        d.indicationCategory
      )
    );

    // Indication category breakdown
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

  // Revenue leakage and wastage totals
  const leakageCount = transactions.filter((tx) => tx.discountFlag).length;

  return (
    <div className="space-y-6 pb-20 text-slate-100">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            One-Screen Operational Radar (UI-03, NFR-USE-02)
          </span>
          <h2 className="text-xl font-black text-white mt-1">{t.insights}</h2>
          <p className="text-xs text-slate-400">
            Time-Series Demand Forecasts • Real Supplier Quality • Zero drill-down tabs
          </p>
        </div>

        {/* Time range selector [7d | 30d | 90d] */}
        <div className="flex bg-[#070d1a] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[38px] ${
                timeRange === range
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: ACTIONABLE INVENTORY ALERTS (Section 9) */}
      <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
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
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">{alert.drugName}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        alert.severity === 'critical'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {alert.metric}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">{alert.details}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">{alert.recommendedAction}</span>
                  <button
                    onClick={() => onNavigateTab(alert.targetTab)}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Resolve</span> <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[#070d1a] rounded-2xl text-center text-xs text-slate-400">
            All inventory levels and expiry shelf-lives are currently within safe thresholds.
          </div>
        )}
      </div>

      {/* SECTION 2: 4 CORE OPERATIONAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Real Sales & Revenue Trend (FR-ANL-01) */}
        <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">{t.salesTrend}</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Past {lookbackDays} Days</span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 bg-[#070d1a] rounded-2xl border border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Revenue</span>
              <div className="text-lg font-black text-cyan-400">
                ₹{salesSummary.totalRevenue.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Units Sold</span>
              <div className="text-lg font-black text-white">{salesSummary.totalUnits}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Transactions</span>
              <div className="text-lg font-black text-emerald-400">{salesSummary.transactionCount}</div>
            </div>
          </div>

          {/* Real Daily Revenue Spark-Line Display */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Recent Daily Revenue Trend:</span>
            <div className="flex items-end gap-1.5 h-16 bg-[#070d1a] p-2 rounded-xl border border-slate-800">
              {salesSummary.dailyPoints.map((dp, i) => {
                const maxVal = Math.max(1, ...salesSummary.dailyPoints.map((p) => p.val));
                const heightPercent = Math.max(15, Math.round((dp.val / maxVal) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-sm"
                      style={{ height: `${heightPercent}%` }}
                      title={`${dp.day}: ₹${dp.val.toFixed(0)}`}
                    />
                    <span className="text-[8px] text-slate-500 font-mono">{dp.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Time-Series Demand Forecasting & Indication Trends (Section 6 & 7) */}
        <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Time-Series Forecast (Holt-Winters)</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800">
              MAPE &lt; 20%
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {forecastInsights.forecasts.slice(0, 3).map((fc) => (
              <div
                key={fc.id}
                className="p-3 bg-[#070d1a] rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">{fc.drugName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {fc.explanation}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono font-extrabold text-cyan-400 text-sm">
                    ~{fc.forecastUnits} units
                  </div>
                  <span className="text-[9px] text-slate-400">7-day projected</span>
                </div>
              </div>
            ))}
          </div>

          {/* Indication Category Share */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 block">Indication Demand Breakdown:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {forecastInsights.indicationTrend.slice(0, 4).map((it, idx) => (
                <div key={idx} className="p-2 bg-[#070d1a] rounded-lg border border-slate-800 flex justify-between">
                  <span className="text-slate-300 truncate">{it.category}</span>
                  <span className="font-mono text-cyan-400 font-bold">{it.sharePercent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Fast & Slow Moving Stock (FR-ANL-04, BR-06) */}
        <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">{t.fastSlowStock}</h3>
            </div>
            <span className="text-[11px] text-slate-400">Velocity Bands</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
            {movement.fastMoving.slice(0, 3).map((item) => (
              <div
                key={item.drug.id}
                className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-800/60 flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-white">{item.drug.brandName}</span>
                  <span className="text-[10px] text-slate-400 block">{item.drug.genericName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-xs">Fast ({item.unitsSold} sold)</span>
                  <span className="text-[10px] text-slate-400 block">{item.velocity}</span>
                </div>
              </div>
            ))}

            {movement.slowMoving.slice(0, 3).map((item) => (
              <div
                key={item.drug.id}
                className="p-2.5 bg-[#070d1a] rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-300">{item.drug.brandName}</span>
                    {item.isNearExpiry && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        Near Expiry
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    No sales in {item.daysWithoutSale} days
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Slow ({item.unitsSold} sold)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Real Supplier Performance Analytics (Section 3.E & 10) */}
        <div className="bg-[#0b1329] p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">{t.supplierPerformance}</h3>
            </div>
            <span className="text-[11px] text-slate-400">Real Receipt Events</span>
          </div>

          <div className="space-y-2 text-xs">
            {supplierStats.map((item) => (
              <div
                key={item.supplier.id}
                className="p-3 bg-[#070d1a] rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">{item.supplier.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Lead Time: {item.supplier.promisedLeadTimeDays}d • Discrepancies: {item.discrepancyCount} • Flags: {item.qualityFlagCount}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-cyan-400">{item.score}/100</div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {item.onTimeRate}% On-Time
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Revenue Leakage Flags: <strong className="text-amber-400">{leakageCount}</strong></span>
            <button
              onClick={() => onNavigateTab('procurement')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Open Procurement Orders &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
