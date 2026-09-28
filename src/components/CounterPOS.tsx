import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ScanLine,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Sparkles,
  ShieldAlert,
  Printer,
  ChevronRight,
  Info,
  Clock,
  ArrowRight,
  Check,
  TrendingUp,
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  ContraindicationReference,
  Transaction,
  CrossSellSuggestion,
  IndicationCategory,
  INDICATION_CATEGORIES,
  SmartScanMatchResult,
} from '../lib/types/pharmaassist';
import { PricingDiscountService } from '../lib/domain/pricing/pricingDiscountService';
import { SafetyCheckService } from '../lib/domain/safety/safetyCheckService';
import { SubstituteRankingService } from '../lib/domain/pos/substituteRankingService';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { CrossSellService } from '../lib/domain/analytics/crossSellService';
import { TimeSeriesForecastService } from '../lib/domain/analytics/timeSeriesForecastService';
import { translations, Language } from '../lib/i18n/translations';

interface CounterPOSProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  contraindications: ContraindicationReference[];
  transactions: Transaction[];
  scannedMatch?: SmartScanMatchResult | null;
  onClearScannedMatch?: () => void;
  onDispatch: (
    drug: DrugMaster,
    batch: StockBatch,
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    prescriptionSighted: boolean,
    visitType: 'OTC' | 'Prescription',
    indicationCategory?: IndicationCategory
  ) => { success: boolean; transaction?: Transaction; error?: string };
  onLogUnmetDemand: (drugText: string, drugId?: string, indication?: IndicationCategory) => void;
  onOpenScanner: () => void;
  onPrintReceipt: (tx: Transaction) => void;
  onTriggerSafetyAlert: (drug: DrugMaster, conflicts: ContraindicationReference[]) => void;
  lang: Language;
}

export const CounterPOS: React.FC<CounterPOSProps> = ({
  drugs,
  batches,
  contraindications,
  transactions,
  scannedMatch,
  onClearScannedMatch,
  onDispatch,
  onLogUnmetDemand,
  onOpenScanner,
  onPrintReceipt,
  onTriggerSafetyAlert,
  lang,
}) => {
  const t = translations[lang];

  // Search & Selected Drug State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<DrugMaster | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);

  // Auto-populate when scanned from Smart OCR Package Scanner
  useEffect(() => {
    if (scannedMatch?.matchedDrug) {
      setSelectedDrug(scannedMatch.matchedDrug);
      if (scannedMatch.matchedBatch) {
        setSelectedBatch(scannedMatch.matchedBatch);
      } else {
        const available = batches.filter(
          (b) => b.drugId === scannedMatch.matchedDrug!.id && b.quantityOnHand > 0
        );
        if (available.length > 0) {
          setSelectedBatch(available[0]);
        }
      }
      if (scannedMatch.matchedDrug.indicationCategory) {
        setSelectedIndication(scannedMatch.matchedDrug.indicationCategory);
      }
      if (onClearScannedMatch) {
        onClearScannedMatch();
      }
    }
  }, [scannedMatch, batches, onClearScannedMatch]);

  // Counter inputs
  const [quantity, setQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [visitType, setVisitType] = useState<'OTC' | 'Prescription'>('OTC');
  const [selectedIndication, setSelectedIndication] = useState<IndicationCategory>('General Health');
  const [prescriptionSighted, setPrescriptionSighted] = useState(false);

  // Patient safety flags
  const [patientCondition, setPatientCondition] = useState<string>('None');

  // Completed transaction & cross-sell state
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [crossSellList, setCrossSellList] = useState<CrossSellSuggestion[]>([]);

  // Filter drugs based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return drugs.filter(
      (d) =>
        d.active &&
        (d.brandName.toLowerCase().includes(query) ||
          d.genericName.toLowerCase().includes(query) ||
          d.strength.toLowerCase().includes(query) ||
          d.identifiers.some((id) => id.toLowerCase().includes(query)))
    );
  }, [searchQuery, drugs]);

  // Batches for the currently selected drug
  const drugBatches = useMemo(() => {
    if (!selectedDrug) return [];
    return batches
      .filter((b) => b.drugId === selectedDrug.id && b.quantityOnHand > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [selectedDrug, batches]);

  // Total stock for selected drug
  const totalStockForSelected = useMemo(() => {
    return drugBatches.reduce((acc, b) => acc + b.quantityOnHand, 0);
  }, [drugBatches]);

  // Substitutes if stock is zero or low
  const substitutes = useMemo(() => {
    if (!selectedDrug || totalStockForSelected > 15) return [];
    return SubstituteRankingService.findSubstitutes(selectedDrug, drugs, batches);
  }, [selectedDrug, totalStockForSelected, drugs, batches]);

  // Pricing calculation
  const pricing = useMemo(() => {
    const unitPrice = selectedDrug ? selectedDrug.listPrice : 0;
    return PricingDiscountService.calculatePricing(unitPrice, quantity, discountPercent, 5.0);
  }, [selectedDrug, quantity, discountPercent]);

  // Safety evaluation
  const safetyResult = useMemo(() => {
    if (!selectedDrug || patientCondition === 'None') {
      return { hasConflict: false, conflicts: [], referenceVersion: 'v1.0-ref', isDispatchBlocked: false };
    }
    return SafetyCheckService.evaluateContraindications(
      selectedDrug,
      [patientCondition],
      contraindications
    );
  }, [selectedDrug, patientCondition, contraindications]);

  // 7-day Demand Forecast hint for selected drug
  const forecastHint = useMemo(() => {
    if (!selectedDrug) return null;
    return TimeSeriesForecastService.generateTimeSeriesForecast(
      selectedDrug.id,
      selectedDrug.brandName,
      transactions,
      visitType,
      selectedIndication
    );
  }, [selectedDrug, transactions, visitType, selectedIndication]);

  // Select drug handler
  const handleSelectDrug = (drug: DrugMaster) => {
    setSelectedDrug(drug);
    setCompletedTx(null);
    setCrossSellList([]);
    setQuantity(1);
    setDiscountPercent(0);
    setPrescriptionSighted(false);

    if (drug.indicationCategory) {
      setSelectedIndication(drug.indicationCategory);
    }

    const available = batches.filter((b) => b.drugId === drug.id && b.quantityOnHand > 0);
    if (available.length > 0) {
      setSelectedBatch(available[0]);
    } else {
      setSelectedBatch(null);
    }

    if (drug.scheduleCategory === 'Prescription') {
      setVisitType('Prescription');
    } else {
      setVisitType('OTC');
    }
  };

  // Perform Dispatch
  const handleDispatch = () => {
    if (!selectedDrug || !selectedBatch) return;

    // Safety Gate Check (FR-POS-02 / NFR-SAFE-01)
    if (safetyResult.hasConflict) {
      onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts);
      if (safetyResult.isDispatchBlocked) {
        return;
      }
    }

    // Prescription Requirement Gate (BR-07)
    if (selectedDrug.scheduleCategory === 'Prescription' && !prescriptionSighted) {
      alert('Prescription verification required! Please sight and check valid doctor prescription (BR-07).');
      return;
    }

    const res = onDispatch(
      selectedDrug,
      selectedBatch,
      quantity,
      selectedDrug.listPrice,
      discountPercent,
      prescriptionSighted,
      visitType,
      selectedIndication
    );

    if (res.success && res.transaction) {
      setCompletedTx(res.transaction);

      // Fetch Predictive Cross-Sell suggestions (FR-ANL-03 & Section 8)
      const suggestions = CrossSellService.getCrossSellSuggestions(
        selectedDrug.id,
        [res.transaction, ...transactions],
        drugs,
        batches,
        new Date(),
        visitType,
        selectedIndication
      );
      setCrossSellList(suggestions);
    } else {
      alert(res.error || 'Dispatch failed');
    }
  };

  return (
    <div className="space-y-5 pb-20 text-slate-100">
      {/* 1. Top Search & Smart Scan Bar */}
      <div className="bg-[#0b1329] p-4 rounded-3xl border border-slate-800 shadow-md space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3 bg-[#070d1a] border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition min-h-[44px]"
            />
          </div>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-cyan-600/20 transition shrink-0 min-h-[44px] cursor-pointer"
            title="Smart OCR & Barcode Scan (Section 5)"
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Smart Scan (OCR)</span>
          </button>
        </div>

        {/* Patient Condition & Indication Context */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Patient Risk:
            </span>
            <select
              value={patientCondition}
              onChange={(e) => setPatientCondition(e.target.value)}
              className="bg-[#070d1a] border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="None">None (Standard Adult / Routine)</option>
              <option value="Penicillin Allergy">Penicillin Allergy (High Risk)</option>
              <option value="Chronic Liver Disease">Chronic Liver Disease</option>
              <option value="Active Liver Failure">Active Liver Failure</option>
              <option value="Severe Renal Impairment">Severe Renal Impairment</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Demand Indication:</span>
            <select
              value={selectedIndication}
              onChange={(e) => setSelectedIndication(e.target.value as IndicationCategory)}
              className="bg-[#070d1a] border border-slate-800 rounded-xl px-2.5 py-1 text-cyan-300 text-xs font-medium focus:outline-none focus:border-cyan-500"
            >
              {INDICATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Candidates Dropdown / List */}
      {searchQuery && (
        <div className="bg-[#0b1329] rounded-3xl border border-cyan-900/60 p-4 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            {t.exactMatch} ({searchResults.length})
          </h3>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchResults.map((drug) => {
                const totalStock = batches
                  .filter((b) => b.drugId === drug.id)
                  .reduce((acc, b) => acc + b.quantityOnHand, 0);

                return (
                  <button
                    key={drug.id}
                    onClick={() => {
                      handleSelectDrug(drug);
                      setSearchQuery('');
                    }}
                    className="text-left p-3.5 rounded-2xl border border-slate-800 hover:border-cyan-500 bg-[#070d1a] hover:bg-cyan-950/30 transition-all space-y-1 min-h-[44px] cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-sm text-white">{drug.brandName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          totalStock > 20
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : totalStock > 0
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {drug.genericName} • {drug.strength}
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-cyan-400">{drug.indicationCategory || drug.dosageForm}</span>
                      <span className="font-bold text-white">₹{drug.listPrice.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-400">{t.noMatch} for "{searchQuery}"</p>
              <button
                onClick={() => {
                  onLogUnmetDemand(searchQuery, undefined, selectedIndication);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>{t.logUnmetDemand} (FR-POS-07)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Main Selected Drug Detail & Dispatch Panel */}
      {selectedDrug && (
        <div className="bg-[#0b1329] rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {selectedDrug.scheduleCategory}
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedDrug.dosageForm}</span>
                {selectedDrug.indicationCategory && (
                  <span className="text-xs text-cyan-400 font-medium">
                    • {selectedDrug.indicationCategory}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white mt-1">{selectedDrug.brandName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedDrug.genericName} • {selectedDrug.strength}
              </p>
            </div>

            <div className="text-right flex sm:flex-col justify-between items-center sm:items-end">
              <div className="text-2xl font-extrabold text-cyan-400">₹{selectedDrug.listPrice.toFixed(2)}</div>
              <span className="text-[11px] text-slate-400">MRP Unit List Price</span>
            </div>
          </div>

          {/* Forecast & Inventory Context Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {forecastHint && (
              <div className="px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 flex items-center gap-1.5 font-mono text-[11px]">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>7d Projected Demand: ~{forecastHint.forecastUnits} units ({forecastHint.trendDirection})</span>
              </div>
            )}
            <div
              className={`px-3 py-1 rounded-xl border text-[11px] font-semibold ${
                totalStockForSelected <= 15
                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              }`}
            >
              Stock on Hand: {totalStockForSelected} units
            </div>
          </div>

          {/* Safety Conflict Warning Banner if active */}
          {safetyResult.hasConflict && (
            <div className="p-4 bg-rose-950/70 border-2 border-rose-600 rounded-2xl text-rose-200 space-y-2 animate-pulse">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{t.contraindicationDetected} ({safetyResult.severity})</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-100">
                {safetyResult.conflicts[0]?.description}
              </p>
              <button
                onClick={() => onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts)}
                className="text-xs font-bold text-rose-300 underline flex items-center gap-1 cursor-pointer"
              >
                View Full Screen Safety Alert (UI-02) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Batch Selector & Available Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Available Batches (Authoritative Stock: {totalStockForSelected})
              </label>

              {drugBatches.length > 0 ? (
                <div className="space-y-2">
                  {drugBatches.map((batch) => {
                    const isSelected = selectedBatch?.id === batch.id;
                    const isNearExpiry = NearExpiryService.isNearExpiry(batch, 90);
                    const daysLeft = NearExpiryService.getDaysToExpiry(batch);

                    return (
                      <button
                        key={batch.id}
                        onClick={() => setSelectedBatch(batch)}
                        className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-950/40 shadow-sm'
                            : 'border-slate-800 hover:border-slate-700 bg-[#070d1a]'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{batch.batchNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Lot: {batch.lotNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>Exp: {batch.expiryDate}</span>
                            {isNearExpiry && (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-950 border border-amber-800 px-1.5 py-0.2 rounded ml-1">
                                Near Expiry ({daysLeft}d)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-white">{batch.quantityOnHand}</span>
                          <span className="text-[10px] text-slate-400 block">units</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 text-xs text-center">
                  <p className="font-bold">Out of Stock at Counter</p>
                  <p className="text-[11px] text-rose-400 mt-1">See recommended generic substitutes below</p>
                </div>
              )}
            </div>

            {/* Side Effect & Usage Reference Panel (FR-POS-09) */}
            <div className="bg-[#070d1a] p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Reference Guide (FR-POS-09)</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 block mb-0.5">{t.dosageDirection}:</span>
                <p className="text-slate-300 leading-relaxed">
                  {selectedDrug.dosageDirection || 'Follow prescribing physician guidelines.'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-400 block mb-0.5">{t.sideEffects}:</span>
                <p className="text-slate-300 leading-relaxed">
                  {selectedDrug.commonSideEffects || 'No common adverse effects logged in master.'}
                </p>
              </div>
            </div>
          </div>

          {/* Substitutes Section (FR-POS-04) if stock is low or zero */}
          {substitutes.length > 0 && (
            <div className="p-4 bg-cyan-950/20 border border-cyan-800/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>{t.substitutes} (Same Generic & Strength, Valid Expiry)</span>
                </h4>
                <span className="text-[10px] text-cyan-400 font-medium">Advisory Only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {substitutes.map((cand) => (
                  <button
                    key={cand.stockBatch.id}
                    onClick={() => handleSelectDrug(cand.drug)}
                    className="p-3 bg-[#070d1a] rounded-xl border border-slate-800 hover:border-cyan-500 text-left transition text-xs space-y-1 cursor-pointer min-h-[44px]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{cand.drug.brandName}</span>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        {cand.availableQuantity} in stock
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Batch: {cand.stockBatch.batchNumber} • Exp: {cand.expiryDate}
                    </div>
                    <div className="text-[11px] font-bold text-cyan-300">
                      ₹{cand.drug.listPrice.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prescription Sighting Checkbox (Schedule H, BR-07) */}
          {selectedDrug.scheduleCategory === 'Prescription' && (
            <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl flex items-center gap-3">
              <input
                type="checkbox"
                id="prescriptionSighted"
                checked={prescriptionSighted}
                onChange={(e) => setPrescriptionSighted(e.target.checked)}
                className="w-5 h-5 text-cyan-600 rounded border-slate-700 focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="prescriptionSighted" className="text-xs font-semibold text-amber-200 cursor-pointer">
                {t.prescriptionSighted} (BR-07 Mandatory Sighting Gate)
              </label>
            </div>
          )}

          {/* Pricing & Quantity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t.quantity}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch?.quantityOnHand || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center py-2.5 bg-[#070d1a] border border-slate-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedBatch?.quantityOnHand || 999, q + 1))
                  }
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t.discount} (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full py-2.5 px-3 bg-[#070d1a] border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
              />
              {pricing.isDiscountCeilingExceeded && (
                <span className="text-[10px] font-bold text-amber-400 block mt-1">
                  ⚠️ Exceeds 5% reference ceiling (Revenue Leakage Flagged, BR-02)
                </span>
              )}
            </div>

            {/* Extended Total Display */}
            <div className="bg-[#070d1a] p-3 rounded-2xl border border-slate-800 flex flex-col justify-center text-right">
              <span className="text-[11px] text-slate-400 font-medium">{t.netTotal} (CON-06 Financial Value)</span>
              <span className="text-2xl font-black text-cyan-400">₹{pricing.extendedValue.toFixed(2)}</span>
              {pricing.discountAmount > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Saved: -₹{pricing.discountAmount.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* 3. Thumb-Reachable Primary Dispatch Button (FR-PLT-03, FR-POS-06) */}
          <div className="pt-2">
            <button
              onClick={handleDispatch}
              disabled={!selectedBatch || selectedBatch.quantityOnHand < quantity}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              <Check className="w-5 h-5" />
              <span>
                {t.dispatch} (₹{pricing.extendedValue.toFixed(2)})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Completed Transaction Card with Advisory Cross-sell (FR-ANL-03, FR-TXN-02) */}
      {completedTx && (
        <div className="bg-emerald-950/40 border border-emerald-700/80 p-5 sm:p-6 rounded-3xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span>Dispatch Successful & Stock Decremented (Tx: {completedTx.id})</span>
            </div>
            <button
              onClick={() => onPrintReceipt(completedTx)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>{t.receiptPrint}</span>
            </button>
          </div>

          {/* Advisory Cross-sell suggestions */}
          {crossSellList.length > 0 && (
            <div className="pt-3 border-t border-emerald-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Frequently Co-Purchased Items (Predictive Cross-Sell, Section 8):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {crossSellList.map((cs) => (
                  <div
                    key={cs.id}
                    className="p-3 bg-[#0b1329] rounded-xl border border-slate-800 text-xs space-y-1"
                  >
                    <div className="font-bold text-white">{cs.suggestedDrug?.brandName}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {cs.explanation || `P=${Math.round((cs.conditionalProbability || 0.6) * 100)}% co-purchase affinity.`}
                    </div>
                    <button
                      onClick={() => cs.suggestedDrug && handleSelectDrug(cs.suggestedDrug)}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <span>Dispense Item</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
