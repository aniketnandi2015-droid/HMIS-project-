import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ShoppingCart,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { CartItem, CrossSellSuggestion } from '../lib/types/pharmaassist';
import { CartService } from '../lib/domain/pos/cartService';
import { AnimatedNumber } from './common/AnimatedNumber';
import { Language, translations } from '../lib/i18n/translations';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onTogglePrescriptionSighted: (itemId: string) => void;
  onClearCart: () => void;
  onDispatchCart: () => void;
  crossSellSuggestions?: CrossSellSuggestion[];
  onAddCrossSellToCart?: (s: CrossSellSuggestion) => void;
  lang: Language;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onTogglePrescriptionSighted,
  onClearCart,
  onDispatchCart,
  crossSellSuggestions = [],
  onAddCrossSellToCart,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const totals = CartService.calculateTotals(cartItems);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/70 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-[#0b1728] border-t sm:border border-[#23455b] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#23455b] flex items-center justify-between bg-[#102236]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 id="cart-drawer-title" className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Customer Cart</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Single customer counter basket • Atomic dispatch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-950/40 transition cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Line Items Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">Your cart is currently empty</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Search or scan medication barcodes/packages on the Counter to add items to this customer's basket.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-[#102236]/80 border border-[#23455b] space-y-2 text-xs"
              >
                {/* Title & Remove */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm leading-snug">{item.drugName}</h3>
                    <div className="text-[11px] text-slate-400">
                      {item.genericName} • {item.strength} • {item.dosageForm}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Remove item"
                    aria-label={`Remove ${item.drugName} from cart`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Batch & Price Details */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#23455b]/60 gap-1">
                  <div>
                    Batch: <span className="font-mono text-slate-300">{item.batchNumber}</span> (Exp: {item.expiryDate})
                  </div>
                  <div className="font-mono text-cyan-300 font-bold">
                    ₹{item.unitPrice.toFixed(2)} / unit
                  </div>
                </div>

                {/* Quantity Controls & Line Extended Total */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 bg-[#0b1728] p-1 rounded-xl border border-[#23455b]">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="p-1 rounded-lg bg-[#102236] hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-white px-2 min-w-[28px] text-center">
                      <AnimatedNumber value={item.quantity} durationMs={200} />
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.maxAvailableQuantity}
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="p-1 rounded-lg bg-[#102236] hover:bg-slate-700 disabled:opacity-30 text-white transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] text-emerald-400 line-through">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                    )}
                    <div className="text-sm font-black text-cyan-400 font-mono">
                      ₹<AnimatedNumber value={item.extendedValue} durationMs={250} decimals={2} />
                    </div>
                  </div>
                </div>

                {/* Status Badges: Safety & Prescription */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {item.safetyStatus === 'blocked' ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>Contraindication Conflict</span>
                    </div>
                  ) : item.safetyStatus === 'prescription_required' && !item.prescriptionSighted ? (
                    <button
                      type="button"
                      onClick={() => onTogglePrescriptionSighted(item.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold hover:bg-amber-900/60 transition cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>Prescription Required (Tap to confirm sighted)</span>
                    </button>
                  ) : item.prescriptionSighted ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                      <FileCheck className="w-3 h-3 text-emerald-400" />
                      <span>Prescription Sighted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Clear for Dispatch</span>
                    </div>
                  )}

                  {item.discountPercent > 5 && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">
                      Discount {item.discountPercent}% &gt; 5% Ceiling
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Unobtrusive Cross-Sell Suggestions */}
          {cartItems.length > 0 && crossSellSuggestions.length > 0 && (
            <div className="pt-2 border-t border-[#23455b]/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Frequently Bought Together (P(B|A) Verified)</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {crossSellSuggestions.slice(0, 2).map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-[#102236]/60 border border-amber-500/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{s.suggestedDrug?.brandName}</div>
                      <div className="text-[10px] text-slate-400">{s.explanation}</div>
                    </div>
                    {onAddCrossSellToCart && (
                      <button
                        type="button"
                        onClick={() => onAddCrossSellToCart(s)}
                        className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer touch-active shrink-0 ml-2"
                      >
                        + Add ₹{s.suggestedDrug?.listPrice}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer & Checkout Breakdown */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-[#23455b] bg-[#102236] space-y-3">
            {/* Blocking Issues Summary */}
            {totals.hasBlockingIssues && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs space-y-1 animate-pulse">
                <div className="font-bold flex items-center gap-1 text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Cannot dispatch basket until resolved:</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                  {totals.blockingReasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price Calculations */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({totals.totalUnits} units):</span>
                <span className="font-mono text-slate-200">
                  ₹<AnimatedNumber value={totals.subtotal} durationMs={200} decimals={2} />
                </span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Total Discount:</span>
                  <span className="font-mono">
                    -₹<AnimatedNumber value={totals.totalDiscount} durationMs={200} decimals={2} />
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-1 border-t border-[#23455b]">
                <span>Grand Total:</span>
                <span className="font-mono text-cyan-400">
                  ₹<AnimatedNumber value={totals.grandTotal} durationMs={300} decimals={2} />
                </span>
              </div>
            </div>

            {/* Atomic Dispatch CTA */}
            <button
              type="button"
              disabled={totals.hasBlockingIssues || cartItems.length === 0}
              onClick={onDispatchCart}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 transition cursor-pointer touch-active min-h-[48px]"
            >
              <span>{t.dispatch} Customer Basket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
