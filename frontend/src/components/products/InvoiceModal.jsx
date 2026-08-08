import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Calendar,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const InvoiceModal = ({ invoice, isOpen, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${invoice.invoiceNumber || 'Rental_Invoice'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const accounting = invoice.accounting || {};
  const customer = invoice.customer || {};
  const rentalPeriod = invoice.rentalPeriod || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rental Invoice • ${invoice.invoiceNumber || 'INV-001'}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-warm-700" id="printable-invoice">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-warm-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-warm-900 shadow-lg shadow-amber">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-warm-900 tracking-tight">Leaseify Rentals Inc.</h3>
              <p className="text-xs text-warm-500">Property & Item Rental Management</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-mono font-bold text-amber-600">
              {invoice.invoiceNumber || 'INV-99201'}
            </span>
            <p className="text-xs text-warm-500 mt-0.5">
              Issued: {new Date(invoice.issueDate || Date.now()).toLocaleDateString()}
            </p>
            <div className="mt-1">
              <Badge variant={invoice.status || 'active'}>{invoice.status || 'active'}</Badge>
            </div>
          </div>
        </div>

        {/* Bill To & Rental Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/20 border border-warm-200 text-xs">
          <div>
            <span className="text-warm-500 font-semibold uppercase tracking-wider block mb-1">
              Billed To (Tenant)
            </span>
            <p className="font-bold text-warm-900 text-sm">{customer.name || 'Alex Rivera'}</p>
            <p className="text-warm-500">{customer.email || 'tenant@leaseify.com'}</p>
            <p className="text-warm-500">{customer.deliveryNotes || 'Suite 44B'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-warm-500 font-semibold uppercase tracking-wider block mb-1">
              Rental Term & Status
            </span>
            <p className="text-warm-600">
              <strong>Start Date:</strong> {new Date(rentalPeriod.startDate || Date.now()).toLocaleDateString()}
            </p>
            <p className="text-warm-600">
              <strong>End Date:</strong> {new Date(rentalPeriod.endDate || Date.now()).toLocaleDateString()} ({rentalPeriod.totalDays} Days)
            </p>
            {rentalPeriod.returnedAt && (
              <p className={rentalPeriod.isLate ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                <strong>Returned:</strong> {new Date(rentalPeriod.returnedAt).toLocaleDateString()}{' '}
                {rentalPeriod.isLate ? `(${rentalPeriod.lateDays} days overdue)` : '(On-time)'}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-2xl border border-warm-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-50 border-b border-warm-200 text-warm-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Rental Item</th>
                <th className="px-4 py-3 text-center">Daily Rate</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-right">Rent Total</th>
                <th className="px-4 py-3 text-right">Deposit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-warm-100/20">
                  <td className="px-4 py-3 font-medium text-warm-900">{item.name}</td>
                  <td className="px-4 py-3 text-center text-warm-600">
                    ₹{Number(item.pricePerDay || 0).toLocaleString('en-IN')}/day
                  </td>
                  <td className="px-4 py-3 text-center text-warm-600">{item.days || rentalPeriod.totalDays}</td>
                  <td className="px-4 py-3 text-right font-semibold text-warm-700">
                    ₹{Number(item.subtotal || item.pricePerDay * (item.days || 1) || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 font-semibold">
                    ₹{Number(item.deposit || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accounting & Settlement Breakdown */}
        <div className="p-5 rounded-2xl bg-warm-50/90 border border-warm-200 space-y-2.5 text-xs">
          <div className="flex justify-between text-warm-600">
            <span>Rental Charges Subtotal:</span>
            <span className="font-semibold text-warm-900">
              ₹{Number(accounting.rentalSubtotal || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-between text-warm-600">
            <span>Security Deposit Paid (Held in Escrow):</span>
            <span className="font-semibold text-amber-600">
              +₹{Number(accounting.depositCharged || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-between font-bold text-sm text-warm-900 pt-1 border-t border-warm-200">
            <span>Initial Total Paid at Booking:</span>
            <span className="text-amber-600">
              ₹{Number(accounting.grandTotalPaid || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Refund & Penalty Settlement Details */}
          {accounting.depositRefunded !== undefined && (
            <div className="mt-3 pt-3 border-t border-warm-200 space-y-1.5 bg-warm-50 p-3 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-warm-600">Return Settlement:</span>
                <span className="text-[11px] font-mono text-warm-500">
                  {accounting.refundTransactionId || 'REF-N/A'}
                </span>
              </div>

              {accounting.penaltyDeducted > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Late Return Penalty Deducted:</span>
                  <span>-₹{Number(accounting.penaltyDeducted || 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Security Deposit Refunded to Account:</span>
                <span>₹{Number(accounting.depositRefunded || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-warm-500 text-[11px] pt-1">
                <span>Net Out-of-Pocket Cost to Customer:</span>
                <span className="text-warm-700 font-semibold">
                  ₹{Number(accounting.netCustomerExpense || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-warm-200">
          <button
            onClick={handleDownloadJSON}
            className="px-3.5 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-warm-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            Download JSON Receipt
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-sky-400 text-warm-900 text-xs font-semibold shadow-md shadow-amber transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>
    </Modal>
  );
};
