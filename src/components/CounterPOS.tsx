import React, { useState, useMemo } from 'react';
import {
  Search,
  Camera,
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
} from 'lucide-react';
import {
  DrugMaster,
  StockBatch,
  ContraindicationReference,
  Transaction,
  CrossSellSuggestion,
} from '../lib/types/pharmaassist';
import { PricingDiscountService } from '../lib/domain/pricing/pricingDiscountService';
import { SafetyCheckService } from '../lib/domain/safety/safetyCheckService';
import { SubstituteRankingService } from '../lib/domain/pos/substituteRankingService';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { CrossSellService } from '../lib/domain/analytics/crossSellService';
import { translations, Language } from '../lib/i18n/translations';

interface CounterPOSProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  contraindications: ContraindicationReference[];
  transactions: Transaction[];
  onDispatch: (
    drug: DrugMaster,
    batch: StockBatch,
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    prescriptionSighted: boolean,
    visitType: 'OTC' | 'Prescription'
  ) => { success: boolean; transaction?: Transaction; error?: string };
  onLogUnmetDemand: (drugText: string, drugId?: string) => void;
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

  // Counter inputs
  const [quantity, setQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [visitType, setVisitType] = useState<'OTC' | 'Prescription'>('OTC');
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

  // Select drug handler
  const handleSelectDrug = (drug: DrugMaster) => {
    setSelectedDrug(drug);
    setCompletedTx(null);
    setCrossSellList([]);
    setQuantity(1);
    setDiscountPercent(0);
    setPrescriptionSighted(false);

    // Auto-select first non-expired batch
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
        return; // Blocked until operator explicitly resolves modal
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
      visitType
    );

    if (res.success && res.transaction) {
      setCompletedTx(res.transaction);

      // Fetch Cross-Sell suggestions (FR-ANL-03)
      const suggestions = CrossSellService.getCrossSellSuggestions(
        selectedDrug.id,
        [res.transaction, ...transactions],
        drugs,
        batches
      );
      setCrossSellList(suggestions);
    } else {
      alert(res.error || 'Dispatch failed');
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* 1. Top Search & Scanning Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition min-h-[44px]"
            />
          </div>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs border border-blue-200 transition shrink-0 min-h-[44px] cursor-pointer"
            title="Scan Barcode / QR (FR-PLT-05, HW-01)"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{t.scanBarcode}</span>
          </button>
        </div>

        {/* Patient Condition / Allergies Triage Flag */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            Patient Condition:
          </span>
          <select
            value={patientCondition}
            onChange={(e) => setPatientCondition(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="None">None (Healthy Adult / Routine)</option>
            <option value="Penicillin Allergy">Penicillin Allergy (High Risk)</option>
            <option value="Chronic Liver Disease">Chronic Liver Disease</option>
            <option value="Active Liver Failure">Active Liver Failure</option>
            <option value="Severe Renal Impairment">Severe Renal Impairment (Kidney)</option>
          </select>
        </div>
      </div>

      {/* Search Candidates Dropdown / List */}
      {searchQuery && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                    className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1 min-h-[44px] cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-sm text-slate-900">{drug.brandName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          totalStock > 20
                            ? 'bg-emerald-100 text-emerald-800'
                            : totalStock > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {drug.genericName} • {drug.strength}
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-slate-400">{drug.dosageForm}</span>
                      <span className="font-bold text-slate-900">${drug.listPrice.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-500">{t.noMatch} for "{searchQuery}"</p>
              <button
                onClick={() => {
                  onLogUnmetDemand(searchQuery);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{t.logUnmetDemand} (FR-POS-07)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Main Selected Drug Detail & Dispatch Panel */}
      {selectedDrug && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                  {selectedDrug.scheduleCategory}
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedDrug.dosageForm}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{selectedDrug.brandName}</h2>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {selectedDrug.genericName} • {selectedDrug.strength}
              </p>
            </div>

            <div className="text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
              <div className="text-2xl font-extrabold text-blue-600">${selectedDrug.listPrice.toFixed(2)}</div>
              <span className="text-[11px] text-slate-400">MRP Unit List Price</span>
            </div>
          </div>

          {/* Safety Conflict Warning Banner if active */}
          {safetyResult.hasConflict && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-2 animate-pulse">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{t.contraindicationDetected} ({safetyResult.severity})</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {safetyResult.conflicts[0]?.description}
              </p>
              <button
                onClick={() => onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts)}
                className="text-xs font-bold text-rose-700 underline flex items-center gap-1 cursor-pointer"
              >
                View Full Screen Safety Alert (UI-02) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Batch Selector & Available Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
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
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{batch.batchNumber}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Lot: {batch.lotNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Exp: {batch.expiryDate}</span>
                            {isNearExpiry && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded ml-1">
                                Near Expiry ({daysLeft}d)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800">{batch.quantityOnHand}</span>
                          <span className="text-[10px] text-slate-400 block">units</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs text-center">
                  <p className="font-bold">Out of Stock at Counter</p>
                  <p className="text-[11px] text-rose-600 mt-1">See recommended generic substitutes below</p>
                </div>
              )}
            </div>

            {/* Side Effect & Usage Reference Panel (FR-POS-09) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Reference Guide (FR-POS-09)</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 block mb-0.5">{t.dosageDirection}:</span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedDrug.dosageDirection || 'Follow prescribing physician guidelines.'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-600 block mb-0.5">{t.sideEffects}:</span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedDrug.commonSideEffects || 'No common adverse effects logged in master.'}
                </p>
              </div>
            </div>
          </div>

          {/* Substitutes Section (FR-POS-04) if stock is low or zero */}
          {substitutes.length > 0 && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>{t.substitutes} (Same Generic & Strength, Valid Expiry)</span>
                </h4>
                <span className="text-[10px] text-blue-700 font-medium">Advisory Only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {substitutes.map((cand) => (
                  <button
                    key={cand.stockBatch.id}
                    onClick={() => handleSelectDrug(cand.drug)}
                    className="p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-400 text-left transition text-xs space-y-1 shadow-2xs cursor-pointer min-h-[44px]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{cand.drug.brandName}</span>
                      <span className="text-emerald-700 font-bold text-[11px]">
                        {cand.availableQuantity} in stock
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Batch: {cand.stockBatch.batchNumber} • Exp: {cand.expiryDate}
                    </div>
                    <div className="text-[11px] font-bold text-slate-800">
                      ${cand.drug.listPrice.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prescription Sighting Checkbox (Schedule H, BR-07) */}
          {selectedDrug.scheduleCategory === 'Prescription' && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-3">
              <input
                type="checkbox"
                id="prescriptionSighted"
                checked={prescriptionSighted}
                onChange={(e) => setPrescriptionSighted(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="prescriptionSighted" className="text-xs font-semibold text-amber-900 cursor-pointer">
                {t.prescriptionSighted} (BR-07 Mandatory Sighting Gate)
              </label>
            </div>
          )}

          {/* Pricing & Quantity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {t.quantity}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch?.quantityOnHand || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedBatch?.quantityOnHand || 999, q + 1))
                  }
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {t.discount} (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
              {pricing.isDiscountCeilingExceeded && (
                <span className="text-[10px] font-bold text-amber-600 block mt-1">
                  ⚠️ Exceeds 5% reference ceiling (Revenue Leakage Flagged, BR-02)
                </span>
              )}
            </div>

            {/* Extended Total Display */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-center text-right">
              <span className="text-[11px] text-slate-500 font-medium">{t.netTotal} (CON-06 Financial Value)</span>
              <span className="text-2xl font-black text-blue-700">${pricing.extendedValue.toFixed(2)}</span>
              {pricing.discountAmount > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold">
                  Saved: -${pricing.discountAmount.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* 3. Thumb-Reachable Primary Dispatch Button (FR-PLT-03, FR-POS-06) */}
          <div className="pt-2">
            <button
              onClick={handleDispatch}
              disabled={!selectedBatch || selectedBatch.quantityOnHand < quantity}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-base transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              <Check className="w-5 h-5" />
              <span>
                {t.dispatch} (${pricing.extendedValue.toFixed(2)})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Completed Transaction Card with Advisory Cross-sell (FR-ANL-03, FR-TXN-02) */}
      {completedTx && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-5 sm:p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <span>Dispatch Successful & Stock Decremented (Tx: {completedTx.id})</span>
            </div>
            <button
              onClick={() => onPrintReceipt(completedTx)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>{t.receiptPrint}</span>
            </button>
          </div>

          {/* Advisory Cross-sell suggestions */}
          {crossSellList.length > 0 && (
            <div className="pt-3 border-t border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Frequently Co-Purchased Items (Advisory Suggestion, FR-ANL-03):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {crossSellList.map((cs) => (
                  <div
                    key={cs.id}
                    className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="font-bold text-slate-900">{cs.suggestedDrug?.brandName}</div>
                    <div className="text-[10px] text-slate-500">
                      Co-purchased {cs.supportCount} times historically
                    </div>
                    <button
                      onClick={() => cs.suggestedDrug && handleSelectDrug(cs.suggestedDrug)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-1 cursor-pointer"
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
