import React from 'react';
import { Printer, X } from 'lucide-react';
import { Transaction } from '../lib/types/pharmaassist';

interface ReceiptPrintModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  transaction,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm">ESC/POS Thermal Slip (HW-02)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper receipt slip rendering */}
        <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl font-mono text-xs text-slate-800 space-y-3 shadow-inner">
          <div className="text-center space-y-0.5">
            <h4 className="font-bold text-sm tracking-wider">PHARMAASSIST RETAIL</h4>
            <p className="text-[10px] text-slate-500">Retail Pharmacy Counter</p>
            <p className="text-[10px] text-slate-400">Tx ID: {transaction.id}</p>
            <p className="text-[10px] text-slate-400">{new Date(transaction.timestamp).toLocaleString()}</p>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
            {transaction.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div>
                  <div className="font-bold">{item.drugName || 'Item'}</div>
                  <div className="text-[9px] text-slate-500">
                    Batch: {item.batchNumber} • Qty: {item.quantity} x ${item.unitPrice.toFixed(2)}
                  </div>
                </div>
                <div className="font-bold">${item.extendedValue.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Discount Applied:</span>
              <span className="text-rose-600 font-semibold">-${transaction.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200">
              <span>TOTAL VALUE:</span>
              <span className="text-blue-700">${transaction.totalValue.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-400 space-y-0.5">
            <p>*** THANK YOU & GET WELL SOON ***</p>
            <p>Transaction logged atomically (FR-POS-06 / CON-06)</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
