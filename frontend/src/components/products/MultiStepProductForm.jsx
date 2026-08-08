import React, { useState } from 'react';
import { createProductWithAxios } from '../../api/productService';
import {
  Package,
  DollarSign,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const MultiStepProductForm = ({ isOpen, onClose, onProductCreated }) => {
  // Step tracker: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState(1);

  // Single top-level state preserving data across all 3 steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    category: 'Furniture',
    description: '',

    // Step 2: Pricing
    price: '',
    deposit: '',

    // Step 3: Availability
    location: '',
    stock: 5,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Generalized field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  // Step 1 -> Step 2 validation & transition
  const handleNextToStep2 = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a product name for Step 1.');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  // Step 2 -> Step 3 validation & transition
  const handleNextToStep3 = (e) => {
    e.preventDefault();
    if (!formData.price || Number(formData.price) <= 0) {
      setError('Please provide a valid daily rental price greater than 0.');
      return;
    }
    setError('');
    setCurrentStep(3);
  };

  // Final Step 3 Submit -> Combines all steps & sends to Backend API
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.location.trim()) {
      setError('Please enter the inventory location (e.g. Warehouse A / Suite 44B).');
      return;
    }

    if (!formData.stock || Number(formData.stock) < 1) {
      setError('Stock quantity must be at least 1 unit.');
      return;
    }

    // Consolidated payload
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim() || `${formData.name} in ${formData.category} available for rent at ${formData.location}.`,
      pricePerDay: Number(formData.price),
      securityDeposit: Number(formData.deposit || 0),
      location: formData.location.trim(),
      stockQuantity: Number(formData.stock),
      images: [formData.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'],
    };

    console.log('[DEBUG - FRONTEND MULTI-STEP FORM] Submitting Combined Data:', payload);

    setLoading(true);
    try {
      const res = await createProductWithAxios(payload);
      console.log('[DEBUG - FRONTEND MULTI-STEP FORM] API Response:', res);

      if (res.success) {
        // Reset form
        setFormData({
          name: '',
          category: 'Furniture',
          description: '',
          price: '',
          deposit: '',
          location: '',
          stock: 5,
          image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
        });
        setCurrentStep(1);
        if (onProductCreated) onProductCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to save product in database.');
      }
    } catch (err) {
      console.error('[DEBUG - FRONTEND SUBMIT ERROR]:', err);
      setError(err.message || 'Network error while contacting backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Step Progress Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Add Rental Product
              </h3>
              <p className="text-xs text-slate-400">Step {currentStep} of 3</p>
            </div>

            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {/* Stepper Indicator Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: '1. Basic Info', icon: Package },
              { num: 2, label: '2. Pricing', icon: DollarSign },
              { num: 3, label: '3. Availability', icon: MapPin },
            ].map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.num;
              const isActive = currentStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500 text-sky-300 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ultra-Comfort Modular Velvet Sectional Sofa"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Furniture">Furniture</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Tools">Tools</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Home Decor">Home Decor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows="3"
                  name="description"
                  placeholder="Brief description of product features, dimensions, or accessories..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Pricing */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Price Per Day (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    name="price"
                    required
                    min="1"
                    placeholder="499"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Daily rental rate in Indian Rupees (₹) billed for the chosen duration.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Deposit (₹) <span className="text-slate-500">(100% Refundable)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    name="deposit"
                    min="0"
                    placeholder="2000"
                    value={formData.deposit}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Held in escrow and refunded in full upon on-time return.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Step 1</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextToStep3}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Availability & Stock */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Inventory Location <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  placeholder="e.g. Mumbai Central Hub / Bangalore Warehouse B"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Stock Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    required
                    min="1"
                    placeholder="5"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="image"
                    placeholder="https://..."
                    value={formData.image}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Review Combined Data Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Summary Preview
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-semibold text-white truncate max-w-[220px]">
                    {formData.name || 'Untitled'} ({formData.category})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Price & Deposit:</span>
                  <span className="font-semibold text-emerald-400">
                    ₹{Number(formData.price || 0).toLocaleString('en-IN')}/day • ₹{Number(formData.deposit || 0).toLocaleString('en-IN')} deposit
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location & Stock:</span>
                  <span className="font-semibold text-slate-200">
                    {formData.location || 'N/A'} • {formData.stock} units
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Step 2</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Saving to Database...' : 'Save Product to MongoDB'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
