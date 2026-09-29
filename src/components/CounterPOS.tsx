import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ScanLine,
  CheckCircle,
  Plus,
  Minus,
  Sparkles,
  ShieldAlert,
  Printer,
  ChevronRight,
  Clock,
  ShoppingCart,
  AlertTriangle,
  Package,
  Zap,
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
  CartItem,
} from '../lib/types/pharmaassist';
import { SafetyCheckService } from '../lib/domain/safety/safetyCheckService';
import { SubstituteRankingService } from '../lib/domain/pos/substituteRankingService';
import { NearExpiryService } from '../lib/domain/inventory/nearExpiryService';
import { CartService } from '../lib/domain/pos/cartService';
import { AnimatedNumber } from './common/AnimatedNumber';
import { Language } from '../lib/i18n/translations';

interface CounterPOSProps {
  drugs: DrugMaster[];
  batches: StockBatch[];
  contraindications: ContraindicationReference[];
  transactions: Transaction[];
  cartItems: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onOpenCart: () => void;
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
  transactions: _transactions,
  cartItems,
  onAddToCart,
  onOpenCart,
  scannedMatch,
  onClearScannedMatch,
  onDispatch,
  onLogUnmetDemand,
  onOpenScanner,
  onPrintReceipt,
  onTriggerSafetyAlert,
  lang: _lang,
}) => {

  // Search & Selected Drug State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<DrugMaster | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);

  // Counter inputs
  const [quantity, setQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [visitType, setVisitType] = useState<'OTC' | 'Prescription'>('OTC');
  const [selectedIndication, setSelectedIndication] = useState<IndicationCategory>('General Health');
  const [prescriptionSighted, setPrescriptionSighted] = useState(false);
  const [patientCondition, setPatientCondition] = useState<string>('None');

  // Completed transaction & cross-sell state
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [crossSellList, setCrossSellList] = useState<CrossSellSuggestion[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Safety evaluation
  const safetyResult = useMemo(() => {
    if (!selectedDrug) return { hasConflict: false, conflicts: [], isDispatchBlocked: false };
    const patientConditions = patientCondition !== 'None' ? [patientCondition] : [];
    const res = SafetyCheckService.evaluateContraindications(
      selectedDrug,
      patientConditions,
      contraindications
    );
    return {
      hasConflict: res.hasConflict,
      conflicts: res.conflicts,
      isDispatchBlocked: res.isDispatchBlocked,
    };
  }, [selectedDrug, patientCondition, contraindications]);

  // Near expiry check on selected batch
  const expiryStatus = useMemo(() => {
    if (!selectedBatch) return null;
    const isNearExpiry = NearExpiryService.isNearExpiry(selectedBatch, 90);
    const daysLeft = NearExpiryService.getDaysToExpiry(selectedBatch);
    return { isNearExpiry, daysLeft };
  }, [selectedBatch]);

  // Select drug and default first FEFO batch
  const handleSelectDrug = (drug: DrugMaster) => {
    setSelectedDrug(drug);
    setSearchQuery('');
    setQuantity(1);

    const available = batches
      .filter((b) => b.drugId === drug.id && b.quantityOnHand > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    if (available.length > 0) {
      setSelectedBatch(available[0]);
    } else {
      setSelectedBatch(null);
    }

    if (drug.indicationCategory) {
      setSelectedIndication(drug.indicationCategory);
    }

    if (drug.scheduleCategory === 'Prescription') {
      setVisitType('Prescription');
    } else {
      setVisitType('OTC');
    }
  };

  // Add Item to Customer Basket (Section 5 & 6)
  const handleAddToCart = () => {
    if (!selectedDrug || !selectedBatch) return;

    // Safety Gate Check (FR-POS-02 / NFR-SAFE-01)
    if (safetyResult.hasConflict) {
      onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts);
      if (safetyResult.isDispatchBlocked) {
        return;
      }
    }

    const cartItem = CartService.createCartItem(
      selectedDrug,
      selectedBatch,
      quantity,
      discountPercent,
      visitType,
      prescriptionSighted,
      selectedIndication,
      patientCondition,
      contraindications
    );

    onAddToCart(cartItem);

    // Show temporary confirmation toast
    setToastMessage(`Added ${selectedDrug.brandName} (${quantity} units) to basket`);
    setTimeout(() => setToastMessage(null), 3500);

    // Reset current selection so operator can continue adding more medicines
    setSelectedDrug(null);
    setSelectedBatch(null);
    setSearchQuery('');
    setQuantity(1);
    setDiscountPercent(0);
    setPrescriptionSighted(false);
  };

  // Direct Quick Dispatch & Invoice Generator Trigger
  const handleDirectDispatch = () => {
    if (!selectedDrug || !selectedBatch) return;

    // Safety Gate Check (FR-POS-02 / NFR-SAFE-01)
    if (safetyResult.hasConflict) {
      onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts);
      if (safetyResult.isDispatchBlocked) {
        return;
      }
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
      onPrintReceipt(res.transaction); // Automatically opens the invoice generator modal!
      setSelectedDrug(null);
      setSelectedBatch(null);
      setSearchQuery('');
      setQuantity(1);
      setDiscountPercent(0);
      setPrescriptionSighted(false);
    } else if (res.error) {
      alert(`Dispatch failed: ${res.error}`);
    }
  };

  // Cart summary totals
  const cartTotals = useMemo(() => CartService.calculateTotals(cartItems), [cartItems]);

  return (
    <div className="space-y-4 pb-24 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl shadow-emerald-950 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Search & Smart Scan Bar */}
      <div className="bg-[#0b1728] p-3.5 sm:p-4 rounded-3xl border border-[#23455b] shadow-md space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine brand, generic salt, strength..."
              className="w-full pl-11 pr-4 py-3 bg-[#102236] border border-[#23455b] rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden transition min-h-[44px]"
            />
          </div>

          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-cyan-600/20 transition shrink-0 min-h-[44px] cursor-pointer touch-active"
            title="Smart OCR & Barcode Scan"
          >
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Smart Scan</span>
          </button>
        </div>

        {/* Patient Condition & Indication Context */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[#23455b]/60">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Patient Risk:
            </span>
            <select
              value={patientCondition}
              onChange={(e) => setPatientCondition(e.target.value)}
              className="bg-[#102236] border border-[#23455b] rounded-xl px-2 py-1 text-slate-200 text-xs font-medium focus:outline-hidden focus:border-cyan-400"
            >
              <option value="None">None (Standard Adult / Routine)</option>
              <option value="Penicillin Allergy">Penicillin Allergy (High Risk)</option>
              <option value="Chronic Liver Disease">Chronic Liver Disease</option>
              <option value="Active Liver Failure">Active Liver Failure</option>
              <option value="Severe Renal Impairment">Severe Renal Impairment</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Indication:</span>
            <select
              value={selectedIndication}
              onChange={(e) => setSelectedIndication(e.target.value as IndicationCategory)}
              className="bg-[#102236] border border-[#23455b] rounded-xl px-2 py-1 text-slate-200 text-xs font-medium focus:outline-hidden focus:border-cyan-400"
            >
              {INDICATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && !selectedDrug && (
          <div className="space-y-1.5 pt-2 border-t border-[#23455b]/60 max-h-72 overflow-y-auto">
            {searchResults.map((drug) => {
              const drugStock = batches
                .filter((b) => b.drugId === drug.id)
                .reduce((acc, b) => acc + b.quantityOnHand, 0);

              return (
                <div
                  key={drug.id}
                  onClick={() => handleSelectDrug(drug)}
                  className="p-3 bg-[#102236] hover:bg-[#162d47] rounded-2xl border border-[#23455b] flex items-center justify-between cursor-pointer transition touch-active"
                >
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                      <span>{drug.brandName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0b1728] text-slate-300 border border-[#23455b]">
                        {drug.dosageForm}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {drug.genericName} • {drug.strength}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-cyan-400 font-mono">
                      ₹{drug.listPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        drugStock > 15 ? 'text-emerald-400' : drugStock > 0 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {drugStock > 0 ? `${drugStock} in stock` : 'Out of stock'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searchQuery.trim().length > 2 && searchResults.length === 0 && !selectedDrug && (
          <div className="p-4 bg-[#102236] rounded-2xl text-center space-y-2 border border-[#23455b]">
            <p className="text-xs text-slate-400">
              No matching registered medicines found for "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                onLogUnmetDemand(searchQuery, undefined, selectedIndication);
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              Log Customer Demand to Procurement
            </button>
          </div>
        )}

        {/* Quick Add Catalog with Live Stock Availability Badges */}
        {!selectedDrug && searchQuery.trim().length === 0 && (
          <div className="space-y-2.5 pt-2 border-t border-[#23455b]/60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Package className="w-3.5 h-3.5" /> Quick Dispensary Catalog (Live Stock)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Tap medicine to select & dispense</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {drugs.slice(0, 6).map((drug) => {
                const stockQty = batches
                  .filter((b) => b.drugId === drug.id)
                  .reduce((acc, b) => acc + b.quantityOnHand, 0);

                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => handleSelectDrug(drug)}
                    className="p-3 rounded-2xl bg-[#102236] hover:bg-[#152e4a] border border-[#23455b] text-left transition cursor-pointer touch-active flex flex-col justify-between space-y-2 group"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="font-bold text-white text-xs truncate max-w-[140px] group-hover:text-cyan-300">
                        {drug.brandName}
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        ₹{drug.listPrice.toFixed(0)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate w-full">
                      {drug.genericName} • {drug.strength}
                    </div>

                    <div className="flex items-center justify-between w-full pt-1.5 border-t border-[#23455b]/50 text-[10px]">
                      <span className="text-slate-500 px-1.5 py-0.2 rounded bg-[#0b1728] border border-[#23455b]">
                        {drug.dosageForm}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full border ${
                          stockQty > 20
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                            : stockQty > 0
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                            : 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                        }`}
                      >
                        {stockQty > 0 ? `${stockQty} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Detected / Selected Medicine Card (Section 5 & 6) */}
      {selectedDrug && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1728] border-2 border-cyan-500/40 shadow-xl space-y-4 animate-in fade-in">
          {/* Header of Detected Drug */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Detected Medicine
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#102236] text-slate-300 font-mono border border-[#23455b]">
                  {selectedDrug.scheduleCategory}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">{selectedDrug.brandName}</h2>
              <p className="text-xs text-slate-400">
                {selectedDrug.genericName} • {selectedDrug.strength} • {selectedDrug.dosageForm}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDrug(null);
                setSelectedBatch(null);
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-[#102236] border border-[#23455b] transition cursor-pointer min-h-[36px]"
            >
              Cancel
            </button>
          </div>

          {/* Prominent Live Stock Availability Display */}
          <div className="p-3.5 bg-gradient-to-r from-[#102236] to-[#142c45] rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Stock Availability
                </span>
              </div>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  totalStockForSelected > 20
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                    : totalStockForSelected > 0
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                    : 'bg-rose-950/80 text-rose-300 border-rose-700/80'
                }`}
              >
                {totalStockForSelected > 20
                  ? '● In Stock'
                  : totalStockForSelected > 0
                  ? '● Low Stock'
                  : '● Out of Stock'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
              <div className="p-2 bg-[#0b1728] rounded-xl border border-[#23455b]">
                <span className="text-[10px] text-slate-400 block">Total In Stock</span>
                <span className="font-mono font-black text-cyan-300 text-sm">
                  <AnimatedNumber value={totalStockForSelected} /> units
                </span>
              </div>
              <div className="p-2 bg-[#0b1728] rounded-xl border border-[#23455b]">
                <span className="text-[10px] text-slate-400 block">Selected Batch Qty</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {selectedBatch ? `${selectedBatch.quantityOnHand} units` : '-'}
                </span>
              </div>
              <div className="p-2 bg-[#0b1728] rounded-xl border border-[#23455b]">
                <span className="text-[10px] text-slate-400 block">Balance After Dispense</span>
                <span
                  className={`font-mono font-black text-sm ${
                    (selectedBatch?.quantityOnHand || 0) - quantity < 0
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {selectedBatch ? Math.max(0, selectedBatch.quantityOnHand - quantity) : 0} units
                </span>
              </div>
            </div>

            {selectedBatch && quantity > selectedBatch.quantityOnHand && (
              <div className="p-2 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Insufficient stock! Selected batch only has {selectedBatch.quantityOnHand} units.
                </span>
              </div>
            )}
          </div>

          {/* Safety Warning Banner if conflict */}
          {safetyResult.hasConflict && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-2xl flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Clinical Contraindication:</strong> {safetyResult.conflicts[0]?.description}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTriggerSafetyAlert(selectedDrug, safetyResult.conflicts)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold shrink-0 ml-2"
              >
                Review Gate
              </button>
            </div>
          )}

          {/* Batch & Expiry Selection */}
          <div className="p-3 bg-[#102236] rounded-2xl border border-[#23455b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Select Available Batch:</span>
              <span className="text-slate-300 font-mono">
                Total Stock: <AnimatedNumber value={totalStockForSelected} /> units
              </span>
            </div>

            {drugBatches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {drugBatches.map((b) => {
                  const isSelected = selectedBatch?.id === b.id;
                  const isNear = NearExpiryService.isNearExpiry(b, 90);
                  const days = NearExpiryService.getDaysToExpiry(b);

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBatch(b)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer touch-active flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 text-white'
                          : 'border-[#23455b] bg-[#0b1728] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-mono">{b.batchNumber}</span>
                        <span className={b.quantityOnHand <= 15 ? 'text-amber-400' : 'text-emerald-400'}>
                          {b.quantityOnHand} units
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>Exp: {b.expiryDate}</span>
                        {isNear && (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {days}d left
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-[#0b1728] rounded-xl text-center text-xs text-rose-400 font-semibold">
                Stockout! No active batches available for {selectedDrug.brandName}.
              </div>
            )}
          </div>

          {/* Near Expiry Warning Pill */}
          {expiryStatus?.isNearExpiry && (
            <div className="flex items-center gap-1.5 p-2.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Batch is near expiry ({expiryStatus.daysLeft} days remaining). FEFO rules apply.
              </span>
            </div>
          )}

          {/* Quantity, Prescription & Price Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
            {/* Quantity Selector */}
            <div className="flex items-center gap-2 bg-[#102236] p-1.5 rounded-xl border border-[#23455b]">
              <span className="text-slate-400 text-xs px-1">Qty:</span>
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1.5 rounded-lg bg-[#0b1728] hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max={selectedBatch?.quantityOnHand || 1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedBatch?.quantityOnHand || 1))
                  )
                }
                className="w-12 text-center bg-transparent font-bold text-sm text-white font-mono focus:outline-hidden"
              />
              <button
                type="button"
                disabled={!selectedBatch || quantity >= selectedBatch.quantityOnHand}
                onClick={() => setQuantity(quantity + 1)}
                className="p-1.5 rounded-lg bg-[#0b1728] hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Prescription Checkbox */}
            {selectedDrug.scheduleCategory === 'Prescription' ? (
              <label className="flex items-center gap-2 p-2 bg-[#102236] rounded-xl border border-[#23455b] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={prescriptionSighted}
                  onChange={(e) => setPrescriptionSighted(e.target.checked)}
                  className="w-4 h-4 text-cyan-500 rounded bg-[#0b1728] border-slate-700 focus:ring-0"
                />
                <span className="text-xs text-slate-200 font-semibold">
                  Prescription Sighted (BR-07)
                </span>
              </label>
            ) : (
              <div className="flex items-center gap-1.5 p-2 bg-[#102236] rounded-xl border border-[#23455b] text-xs text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Over-The-Counter (OTC)</span>
              </div>
            )}

            {/* Price Preview */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Extended Value</span>
              <span className="text-lg font-black text-cyan-400 font-mono">
                ₹{(selectedDrug.listPrice * quantity).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dual Action CTAs: Add to Basket OR Instant Dispatch & Issue Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={!selectedBatch || selectedBatch.quantityOnHand <= 0 || quantity > selectedBatch.quantityOnHand}
              onClick={handleAddToCart}
              className="py-3 px-4 rounded-xl bg-[#102236] hover:bg-[#183659] border border-cyan-500/40 text-cyan-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer touch-active min-h-[46px]"
            >
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              <span>Add to Basket (₹{(selectedDrug.listPrice * quantity).toFixed(2)})</span>
            </button>

            <button
              type="button"
              disabled={!selectedBatch || selectedBatch.quantityOnHand <= 0 || quantity > selectedBatch.quantityOnHand}
              onClick={handleDirectDispatch}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer touch-active min-h-[46px]"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Dispatch & Issue Invoice</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Substitutes Section if selected drug is out of stock */}
      {selectedDrug && totalStockForSelected === 0 && substitutes.length > 0 && (
        <div className="p-4 bg-[#0b1728] rounded-3xl border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Ranked In-Stock Generic Substitutes (FR-POS-04)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {substitutes.map((sub) => (
              <button
                key={sub.drug.id}
                type="button"
                onClick={() => handleSelectDrug(sub.drug)}
                className="p-3 bg-[#102236] hover:bg-[#162d47] border border-[#23455b] rounded-2xl text-left text-xs space-y-1 transition cursor-pointer touch-active"
              >
                <div className="flex justify-between items-center font-bold text-white">
                  <span>{sub.drug.brandName}</span>
                  <span className="text-cyan-400 font-mono">₹{sub.drug.listPrice}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {sub.drug.genericName} • Stock: {sub.availableQuantity}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Completed Transaction Banner (Handover & Cross-sell) */}
      {completedTx && (
        <div className="p-5 bg-gradient-to-tr from-emerald-950/60 to-slate-900 border-2 border-emerald-500/50 rounded-3xl space-y-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white">
                Transaction Completed (#{completedTx.id.slice(-6)})
              </h3>
            </div>
            <span className="font-mono font-black text-emerald-400 text-base">
              ₹{completedTx.totalValue.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Stock ledger successfully decremented atomically. All transaction line items recorded.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onPrintReceipt(completedTx)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[44px] touch-active"
            >
              <Printer className="w-4 h-4" />
              <span>Print ESC/POS Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedTx(null);
                setCrossSellList([]);
              }}
              className="px-4 py-2 bg-[#102236] hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px] touch-active"
            >
              Start New Customer
            </button>
          </div>

          {/* Predictive Cross-Sell Handover Items */}
          {crossSellList.length > 0 && (
            <div className="pt-3 border-t border-emerald-900/60 space-y-2">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Handover Recommendation:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {crossSellList.map((cs) => (
                  <div
                    key={cs.id}
                    className="p-3 bg-[#0b1728] border border-[#23455b] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{cs.suggestedDrug?.brandName}</div>
                      <div className="text-[10px] text-slate-400">{cs.explanation}</div>
                    </div>
                    {cs.suggestedDrug && (
                      <button
                        type="button"
                        onClick={() => handleSelectDrug(cs.suggestedDrug!)}
                        className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition cursor-pointer touch-active ml-2 shrink-0"
                      >
                        Select
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Sticky Floating Customer Cart Bar (Section 21 Mobile Layout) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 py-2 bg-gradient-to-t from-[#0b1728] via-[#0b1728]/95 to-transparent">
          <div className="max-w-md mx-auto p-3 bg-gradient-to-r from-[#102236] to-[#0d1d30] border-2 border-cyan-500/50 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <ShoppingCart className="w-5 h-5 animate-pulse-once" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">
                  <AnimatedNumber value={cartTotals.itemCount} durationMs={200} /> {cartTotals.itemCount === 1 ? 'item' : 'items'} in Basket
                </span>
                <span className="text-[11px] font-bold text-cyan-400 font-mono">
                  Total: ₹<AnimatedNumber value={cartTotals.grandTotal} durationMs={250} decimals={2} />
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCart}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-cyan-900/40 transition cursor-pointer touch-active min-h-[44px]"
            >
              <span>Review Cart</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
