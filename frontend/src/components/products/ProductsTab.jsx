import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { ProductDetailsModal } from './ProductDetailsModal';
import { MultiStepProductForm } from './MultiStepProductForm';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  Package,
  Search,
  Plus,
  DollarSign,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Eye,
  MapPin,
} from 'lucide-react';

export const ProductsTab = ({ onNavigateToCart }) => {
  const { role } = useAuth();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await api.getProducts({
      search,
      category: categoryFilter,
    });
    if (res.success) {
      setProducts(res.data);
    }
    setLoading(false);
  };

  const handleProductCreated = (newProduct) => {
    fetchProducts();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this product from the rental inventory?')) {
      const res = await api.deleteProduct(id);
      if (res.success) {
        fetchProducts();
      }
    }
  };

  const categories = ['all', 'Furniture', 'Appliances', 'Electronics', 'Tools', 'Home Decor'];

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Rental Store & Products</h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              Daily Rentals
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Rent high-end furniture, home appliances, consumer electronics, and professional tools.
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rental Product (3-Step Form)
          </button>
        )}
      </div>

      {/* Filter & Category Pills Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by title, location, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product._id}
            onClick={() => setSelectedProduct(product)}
            className="group glass-panel rounded-2xl overflow-hidden border border-slate-800/90 hover:border-slate-700 hover:shadow-2xl transition-all flex flex-col cursor-pointer"
          >
            {/* Product Image */}
            <div className="relative h-52 w-full overflow-hidden bg-slate-950">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
                  {product.category}
                </span>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <Badge variant={product.stockQuantity > 0 ? 'available' : 'overdue'}>
                  {product.stockQuantity > 0 ? `${product.stockQuantity} In Stock` : 'Out of Stock'}
                </Badge>
                {role === 'admin' && (
                  <button
                    onClick={(e) => handleDelete(product._id, e)}
                    title="Delete product"
                    className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-white tracking-tight">
                    ₹{Number(product.pricePerDay || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-300"> / day</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>₹{Number(product.securityDeposit || 0).toLocaleString('en-IN')} Dep.</span>
                </div>
              </div>
            </div>

            {/* Product Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                  {product.name}
                </h3>
                {product.location && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">{product.location}</span>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, undefined, undefined, 7);
                      if (onNavigateToCart) onNavigateToCart();
                    }}
                    className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Rent
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onNavigateToCart={onNavigateToCart}
        />
      )}

      {/* 3-Step Product Creation Form Modal */}
      <MultiStepProductForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
};
