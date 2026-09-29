import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle,
  Copy,
  User,
  Stethoscope,
  Building2,
} from 'lucide-react';
import { Transaction } from '../lib/types/pharmaassist';

interface InvoiceGeneratorModalProps {
  transaction: Transaction;
  onClose: () => void;
}

// Convert numbers to Indian Rupees words
function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tensMultiple = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return twoDigits[n - 10];
    return tensMultiple[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + singleDigits[n % 10] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += singleDigits[hundred] + ' Hundred';
      if (rest > 0) res += ' and ';
    }
    res += convertTwoDigits(rest);
    return res;
  }

  let num = rounded;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundreds = num;

  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertThreeDigits(hundreds);

  return 'Rupees ' + words.trim() + ' Only';
}

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  transaction,
  onClose,
}) => {
  const [format, setFormat] = useState<'tax_invoice' | 'thermal_slip'>('tax_invoice');
  const [customerName, setCustomerName] = useState('Walk-in Customer / Cash');
  const [customerPhone, setCustomerPhone] = useState('+91 98XXX XXXXX');
  const [prescriberName, setPrescriberName] = useState(
    transaction.visitType === 'Prescription' ? 'Dr. R. K. Mukherjee, MBBS, MD' : 'Self / OTC'
  );
  const [copied, setCopied] = useState(false);

  // Financial calculations
  const grossSubtotal =
    transaction.items?.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0) ||
    transaction.totalValue;
  const discountTotal = transaction.totalDiscount;
  const netPayable = transaction.totalValue;

  // Assumed GST is 12% included in retail MRP for formulations (6% CGST + 6% SGST)
  const taxableValue = Number((netPayable / 1.12).toFixed(2));
  const totalTax = Number((netPayable - taxableValue).toFixed(2));
  const cgst = Number((totalTax / 2).toFixed(2));
  const sgst = Number((totalTax / 2).toFixed(2));

  const invoiceNumber = `INV-${new Date(transaction.timestamp)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${transaction.id.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `PharmaAssist Tax Invoice ${invoiceNumber}\nDate: ${new Date(
      transaction.timestamp
    ).toLocaleString()}\nTotal: ₹${netPayable.toFixed(2)}\nItems: ${transaction.items
      ?.map((i) => `${i.drugName} (Qty: ${i.quantity})`)
      .join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>Pharmaceutical Invoice Generator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  Ready to Issue
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">Invoice #{invoiceNumber}</p>
            </div>
          </div>

          {/* Format Switcher & Close */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-slate-200 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFormat('tax_invoice')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  format === 'tax_invoice'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tax Invoice (A4)
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal_slip')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  format === 'thermal_slip'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal Slip (80mm)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              title="Close Invoice Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer & Prescriber Quick Edit Panel */}
        <div className="px-5 py-2.5 bg-cyan-50/50 border-b border-cyan-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span className="text-slate-500 text-[11px] font-medium shrink-0">Customer:</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-white border border-cyan-200 rounded-lg px-2 py-1 text-slate-900 text-xs w-full focus:outline-hidden focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-medium shrink-0">Phone:</span>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="bg-white border border-cyan-200 rounded-lg px-2 py-1 text-slate-900 text-xs w-full focus:outline-hidden focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span className="text-slate-500 text-[11px] font-medium shrink-0">Doctor:</span>
            <input
              type="text"
              value={prescriberName}
              onChange={(e) => setPrescriberName(e.target.value)}
              className="bg-white border border-cyan-200 rounded-lg px-2 py-1 text-slate-900 text-xs w-full focus:outline-hidden focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          {format === 'tax_invoice' ? (
            /* ===============================================================
               TAX INVOICE A4 / DETAILED PHARMACY BILL
               =============================================================== */
            <div
              id="printable-invoice"
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-900 space-y-5 print:border-none print:shadow-none"
            >
              {/* Pharmacy Identity Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 border-slate-900 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-cyan-700" />
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      PHARMAASSIST RETAIL PHARMACY
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    128 Central Avenue, Medical District, Kolkata - 700073
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Phone: +91 98300 12345 • Email: dispensary@pharmaassist.com
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-700 font-mono mt-1 font-semibold">
                    <span>DL No: DL-20B/21B-WB/2026/88921</span>
                    <span>GSTIN: 19AAACP1234F1Z5</span>
                    <span>FSSAI: 12824019000123</span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg">
                    RETAIL TAX INVOICE
                  </span>
                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                    <p>
                      <strong>Invoice No:</strong>{' '}
                      <span className="font-mono text-cyan-800">{invoiceNumber}</span>
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(transaction.timestamp).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p>
                      <strong>Time:</strong>{' '}
                      {new Date(transaction.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Billed To / Patient Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Patient / Customer:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{customerName}</p>
                  <p className="text-slate-500 text-[11px]">Contact: {customerPhone}</p>
                  <p className="text-slate-500 text-[11px]">
                    Mode:{' '}
                    <span className="font-semibold text-emerald-700">
                      {transaction.visitType} (Cash / Recorded Settlement)
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prescriber / Clinic:
                  </span>
                  <p className="font-bold text-slate-900">{prescriberName}</p>
                  <p className="text-slate-500 text-[11px]">
                    Prescription Sighted:{' '}
                    <strong className="text-slate-800">
                      {transaction.prescriptionSighted ? 'YES (Verified BR-07)' : 'N/A (OTC)'}
                    </strong>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Terminal: <strong>Counter Terminal #1 (Single-Operator)</strong>
                  </p>
                </div>
              </div>

              {/* Itemized Medicine Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-[11px] font-bold text-slate-700 bg-slate-100">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">Medicine / Product Description</th>
                      <th className="py-2 px-2 text-center">Batch</th>
                      <th className="py-2 px-2 text-center">Expiry</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">MRP (₹)</th>
                      <th className="py-2 px-2 text-right">Disc %</th>
                      <th className="py-2 px-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transaction.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-slate-900">{item.drugName || 'Item'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            HSN: 3004 • {item.indicationCategory || 'General Health'}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-700 font-medium">
                          {item.batchNumber}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600">2027/28</td>
                        <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                          {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-600">
                          {item.discount > 0
                            ? `${((item.discount / (item.quantity * item.unitPrice)) * 100).toFixed(0)}%`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900">
                          {item.extendedValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Summary Calculation Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-300">
                {/* GST Tax Summary Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    GST Tax Breakdown (Included in MRP):
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono">₹{taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST @ 6%):</span>
                    <span className="font-mono">₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST @ 6%):</span>
                    <span className="font-mono">₹{sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                    <span>Total GST Amount (12%):</span>
                    <span className="font-mono">₹{totalTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Final Net Totals Box */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Value:</span>
                    <span className="font-mono">₹{grossSubtotal.toFixed(2)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total Savings / Discount:</span>
                      <span className="font-mono">-₹{discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                    <span>TOTAL PAYABLE:</span>
                    <span className="font-mono text-cyan-700 text-lg">₹{netPayable.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic text-right font-medium">
                    ({numberToWordsINR(netPayable)})
                  </p>
                </div>
              </div>

              {/* Legal Declarations & Signature */}
              <div className="pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="space-y-1 max-w-sm">
                  <p className="font-bold text-slate-700">Terms & Conditions:</p>
                  <p>1. Medicines once sold cannot be taken back or exchanged without batch bill.</p>
                  <p>2. Keep medicines stored under 25°C away from direct sunlight.</p>
                  <p>3. This invoice is electronically verified from authoritative stock ledger.</p>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <div className="h-10 border-b border-slate-400 w-36 mb-1"></div>
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Registered Pharmacist
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">License Stamp & Sign</span>
                </div>
              </div>
            </div>
          ) : (
            /* ===============================================================
               ESC/POS THERMAL SLIP VIEW (80mm)
               =============================================================== */
            <div
              id="printable-thermal"
              className="max-w-xs mx-auto bg-slate-50 border border-dashed border-slate-300 p-5 rounded-2xl font-mono text-xs text-slate-800 space-y-3 shadow-inner"
            >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-sm tracking-wider">PHARMAASSIST RETAIL</h3>
                <p className="text-[10px] text-slate-500">Retail Pharmacy Counter</p>
                <p className="text-[10px] text-slate-400 font-mono">DL: WB-2026-88921 • GSTIN: 19AAACP1234F1Z5</p>
                <p className="text-[10px] text-slate-600 font-bold">{invoiceNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(transaction.timestamp).toLocaleString()}</p>
                <p className="text-[10px] text-slate-600">Customer: {customerName}</p>
              </div>

              <div className="space-y-2 py-1">
                {transaction.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div>
                      <div className="font-bold">{item.drugName || 'Item'}</div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        B:{item.batchNumber} • {item.quantity} x ₹{item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-bold font-mono">₹{item.extendedValue.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Total:</span>
                  <span className="font-mono">₹{grossSubtotal.toFixed(2)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>NET TOTAL:</span>
                  <span className="font-mono text-cyan-700">₹{netPayable.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 space-y-0.5">
                <p>*** THANK YOU & GET WELL SOON ***</p>
                <p>Authoritative Stock Ledger Dispatched (FR-POS-06)</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer min-h-[44px]"
            >
              Start Next Sale
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer min-h-[44px] touch-active"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
