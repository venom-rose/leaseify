import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { InvoiceModal } from './InvoiceModal';
import {
  ShoppingBag,
  Trash2,
  Calendar,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  Package,
  Building,
  Loader2,
  FileText,
  Lock,
} from 'lucide-react';

export const CartPage = ({ onNavigateToProducts, onNavigateToRentals }) => {
  const {
    cartItems,
    removeFromCart,
    updateCartItemDates,
    clearCart,
    subtotal,
    depositTotal,
    grandTotal,
    totalItemCount,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [deliveryNotes, setDeliveryNotes] = useState('Deliver to Suite 44B');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [simStep, setSimStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    // Trigger Payment Simulation flow
    setIsSimulatingPayment(true);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
    }, 1000);

    setTimeout(async () => {
      setSimStep(3);

      const payload = {
        items: cartItems.map((item) => ({
          product: item.product._id,
          name: item.product.name,
          pricePerDay: item.product.pricePerDay,
          securityDeposit: item.product.securityDeposit,
          startDate: item.startDate,
          endDate: item.endDate,
          days: item.days,
          subtotal: item.subtotal,
          deposit: item.deposit,
          image: item.product.images?.[0] || '',
        })),
        startDate: cartItems[0]?.startDate || new Date(),
        endDate: cartItems[0]?.endDate || new Date(),
        totalDays: Math.max(...cartItems.map((i) => i.days)),
        paymentMethod,
        notes: deliveryNotes,
      };

      const res = await api.createRentalBooking(payload);
      setIsSimulatingPayment(false);

      if (res.success) {
        setCompletedOrder(res.data);
        clearCart();
      }
    }, 2200);
  };

  const handleViewInvoice = async (rentalId) => {
    const res = await api.getInvoice(rentalId);
    if (res.success) {
      setInvoiceData(res.data);
    }
  };

  if (cartItems.length === 0 && !completedOrder) {
    return (
      <div className="glass-panel rounded-3xl border border-warm-200 p-12 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-white border border-warm-200 flex items-center justify-center mx-auto text-warm-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-warm-900">Your Rental Cart is Empty</h3>
        <p className="text-xs text-warm-500 max-w-sm mx-auto">
          Browse our inventory of furniture, high-end electronics, appliances, and tools to reserve items for your unit.
        </p>
        <button
          onClick={onNavigateToProducts}
          className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-sky-400 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all inline-flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          Browse Rental Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onNavigateToProducts}
            className="text-xs text-amber-600 hover:underline flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Products Catalog
          </button>
          <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Rental Cart & Checkout</h2>
          <p className="text-xs text-warm-500 mt-0.5">
            Review rental periods, refundable deposits, and complete your reservation.
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-red-500 hover:text-red-400 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.product._id}
              className="glass-panel p-5 rounded-2xl border border-warm-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              {/* Product Thumbnail & Details */}
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={item.product.images?.[0]}
                  alt={item.product.name}
                  className="h-20 w-20 rounded-xl object-cover border border-warm-200 bg-warm-50 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-600">
                    {item.product.category}
                  </span>
                  <h4 className="text-sm font-bold text-warm-900 truncate max-w-sm">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-warm-500 mt-0.5">
                    ₹{Number(item.product.pricePerDay || 0).toLocaleString('en-IN')} / day •{' '}
                    <span className="text-amber-600">
                      ₹{Number(item.product.securityDeposit || 0).toLocaleString('en-IN')} Deposit
                    </span>
                  </p>
                </div>
              </div>

              {/* Rental Dates & Calculation */}
              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-warm-200">
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-1.5 text-xs text-warm-600">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>{item.days} Days Duration</span>
                  </div>
                  <p className="text-xs text-warm-400">
                    {item.startDate} to {item.endDate}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    ₹{Number(item.subtotal || 0).toLocaleString('en-IN')}{' '}
                    <span className="text-[11px] font-normal text-warm-500">
                      (+₹{Number(item.deposit || 0).toLocaleString('en-IN')} dep)
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => removeFromCart(item.product._id)}
                  className="p-2 rounded-xl text-warm-500 hover:text-red-500 hover:bg-warm-100 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary & Checkout Card */}
        <div className="glass-panel p-6 rounded-3xl border border-warm-200 space-y-5 h-fit">
          <h3 className="text-base font-bold text-warm-900 tracking-tight">Reservation Summary</h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-warm-600">
              <span>Total Items:</span>
              <span className="font-semibold text-warm-900">{totalItemCount} Units</span>
            </div>
            <div className="flex justify-between text-warm-600">
              <span>Rental Charges:</span>
              <span className="font-semibold text-warm-900">
                ₹{Number(subtotal || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-warm-600">
              <span className="flex items-center gap-1">
                Refundable Security Deposit:
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <span className="font-semibold text-amber-600">
                +₹{Number(depositTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-warm-200 pt-3 flex justify-between text-base font-bold">
              <span className="text-warm-900">Total Due Today:</span>
              <span className="text-emerald-600">
                ₹{Number(grandTotal || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-warm-700 mb-1.5">
              Payment Gateway Simulation
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Credit Card">Credit Card / Debit Card (Instant Online)</option>
              <option value="UPI">UPI / QR Code (PhonePe, Google Pay, Paytm)</option>
              <option value="Net Banking">Net Banking / IMPS / NEFT</option>
              <option value="Cash">Cash On Delivery</option>
            </select>
          </div>

          {/* Delivery Note */}
          <div>
            <label className="block text-xs font-semibold text-warm-700 mb-1.5">
              Delivery Destination / Unit
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Suite 44B"
              className="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleCheckout}
            disabled={isSimulatingPayment}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-emerald-400 hover:to-teal-500 text-warm-900 font-semibold rounded-xl text-sm shadow-lg shadow-amber transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>Pay & Reserve Items (₹{Number(grandTotal || 0).toLocaleString('en-IN')})</span>
          </button>

          <p className="text-[11px] text-center text-warm-400">
            🔒 Escrow Protected: Security deposit of ₹{Number(depositTotal || 0).toLocaleString('en-IN')} is held and automatically refunded upon on-time return.
          </p>
        </div>
      </div>

      {/* Payment Gateway Simulation Dialog */}
      <Modal
        isOpen={isSimulatingPayment}
        onClose={() => {}}
        title="Payment Gateway Authorization"
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto animate-pulse">
            <CreditCard className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-base font-bold text-warm-900">Simulating Online Transaction</h4>
            <p className="text-xs text-warm-500 mt-1">
              Processing ₹{Number(grandTotal || 0).toLocaleString('en-IN')} via {paymentMethod}...
            </p>
          </div>

          <div className="space-y-2 text-left text-xs bg-warm-50 p-4 rounded-2xl border border-warm-200">
            <div className={`flex items-center gap-2 ${simStep >= 1 ? 'text-emerald-600' : 'text-warm-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>Verifying tokenized payment & account details</span>
            </div>
            <div className={`flex items-center gap-2 ${simStep >= 2 ? 'text-emerald-600' : 'text-warm-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorizing rental fee (₹{Number(subtotal || 0).toLocaleString('en-IN')}) & deposit (₹{Number(depositTotal || 0).toLocaleString('en-IN')})</span>
            </div>
            <div className={`flex items-center gap-2 ${simStep >= 3 ? 'text-emerald-600' : 'text-warm-400'}`}>
              {simStep >= 3 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Generating invoice & issuing confirmation</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Booking Confirmation Receipt Modal */}
      {completedOrder && (
        <Modal
          isOpen={!!completedOrder}
          onClose={() => setCompletedOrder(null)}
          title="Rental Booking Confirmed! 🎉"
          maxWidth="max-w-lg"
        >
          <div className="text-center space-y-4 py-2">
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-warm-900">Order #{completedOrder.transactionId}</h4>
              <p className="text-xs text-warm-500 mt-1">
                Payment successful! Security deposit of ₹{Number(completedOrder.depositTotal || 0).toLocaleString('en-IN')} held in escrow.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-warm-500">Total Items:</span>
                <span className="text-warm-900 font-medium">{completedOrder.items?.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Duration:</span>
                <span className="text-warm-900 font-medium">{completedOrder.totalDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Security Deposit:</span>
                <span className="text-amber-600 font-medium">
                  ₹{Number(completedOrder.depositTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-t border-warm-200 pt-2 font-bold">
                <span className="text-warm-900">Amount Paid:</span>
                <span className="text-emerald-600">
                  ₹{Number(completedOrder.grandTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleViewInvoice(completedOrder._id)}
                className="py-2.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-amber-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                View Full Invoice
              </button>
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  if (onNavigateToRentals) onNavigateToRentals();
                }}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-sky-400 text-warm-900 text-xs font-semibold shadow-md shadow-amber transition-all"
              >
                Go to My Rentals
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Modal */}
      {invoiceData && (
        <InvoiceModal
          invoice={invoiceData}
          isOpen={!!invoiceData}
          onClose={() => setInvoiceData(null)}
        />
      )}
    </div>
  );
};
