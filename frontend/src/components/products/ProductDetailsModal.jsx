import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { useCart } from '../../context/CartContext';
import {
  Calendar,
  DollarSign,
  ShieldCheck,
  ShoppingBag,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ProductDetailsModal = ({ product, isOpen, onClose, onNavigateToCart }) => {
  const { addToCart } = useCart();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(7);
  const [addedAlert, setAddedAlert] = useState(false);

  if (!product) return null;

  const calculateEndDate = (start, numDays) => {
    const s = new Date(start);
    s.setDate(s.getDate() + Number(numDays));
    return s.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate, days);
  const rentalSubtotal = product.pricePerDay * days;
  const grandTotal = rentalSubtotal + product.securityDeposit;

  const handleAddToCart = () => {
    addToCart(product, startDate, endDate, days);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 2500);
  };

  const handleRentNow = () => {
    addToCart(product, startDate, endDate, days);
    onClose();
    if (onNavigateToCart) onNavigateToCart();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.name} maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Images & Specs */}
        <div className="space-y-4">
          <div className="h-64 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
            <img
              src={product.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
                {product.category}
              </span>
            </div>
            <div className="absolute top-3 right-3">
              <Badge variant={product.stockQuantity > 0 ? 'available' : 'overdue'}>
                {product.stockQuantity > 0 ? `${product.stockQuantity} In Stock` : 'Out of Stock'}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Product Overview
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{product.description}</p>
          </div>

          {/* Key Specs */}
          {product.specifications && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Brand / Maker:</span>
                <span className="text-white font-medium">{product.specifications.brand || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Condition:</span>
                <span className="text-white font-medium">{product.specifications.condition || 'Like New'}</span>
              </div>
              {product.specifications.dimensions && (
                <div className="flex justify-between text-slate-400">
                  <span>Dimensions:</span>
                  <span className="text-white font-medium">{product.specifications.dimensions}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Rental Calculator & Add to Cart */}
        <div className="space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Pricing Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-white">
                    ₹{Number(product.pricePerDay || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400"> / day</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Security Deposit</span>
                  <p className="text-sm font-bold text-amber-400">
                    ₹{Number(product.securityDeposit || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * Security deposit is 100% refundable when returned in original condition.
              </p>
            </div>

            {/* Select Rental Period */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-200">
                Choose Rental Duration
              </label>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[3, 7, 14, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDays(num)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      days === num
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/25'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {num} Days
                  </button>
                ))}
              </div>

              {/* Start Date & Custom Days Input */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Start Date</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Rental Days</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Rental Period: <strong>{startDate}</strong> to <strong>{endDate}</strong> ({days} days)
                </span>
              </div>
            </div>

            {/* Price Breakdown Calculation */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Rental ({days} days × ₹{Number(product.pricePerDay || 0).toLocaleString('en-IN')}):</span>
                <span className="font-semibold text-white">
                  ₹{Number(rentalSubtotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  Refundable Deposit:
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </span>
                <span className="font-semibold text-amber-400">
                  +₹{Number(product.securityDeposit || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                <span className="text-white">Total Due Today:</span>
                <span className="text-emerald-400">
                  ₹{Number(grandTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {addedAlert && (
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Added to your Rental Cart!
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                Add to Cart
              </button>

              <button
                type="button"
                onClick={handleRentNow}
                className="py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Rent Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
