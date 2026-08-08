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
            <h2 className="text-2xl font-bold text-warm-900 tracking-tight">Rental Store & Products</h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold">
              Daily Rentals
            </span>
          </div>
          <p className="text-sm text-warm-500 mt-1">
            Rent high-end furniture, home appliances, consumer electronics, and professional tools.
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 text-xs font-semibold shadow-lg shadow-amber transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rental Product (3-Step Form)
          </button>
        )}
      </div>

      {/* Filter & Category Pills Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-warm-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-warm-500" />
            <input
              type="text"
              placeholder="Search products by title, location, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-warm-200 rounded-xl text-xs text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500"
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
                    ? 'bg-amber-500 text-warm-900 shadow-md shadow-amber'
                    : 'bg-warm-50 border border-warm-200 text-warm-500 hover:text-warm-900'
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
            className="group glass-panel rounded-2xl overflow-hidden border border-warm-200/90 hover:border-warm-200 hover:shadow-xl transition-all flex flex-col cursor-pointer"
          >
            {/* Product Image */}
            <div className="relative h-52 w-full overflow-hidden bg-warm-50">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-xs font-semibold text-warm-900">
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
                    className="p-1.5 rounded-lg bg-red-500/20 border border-red-200 text-red-500 hover:bg-red-500 hover:text-warm-900 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-warm-900 tracking-tight">
                    ₹{Number(product.pricePerDay || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-warm-600"> / day</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>₹{Number(product.securityDeposit || 0).toLocaleString('en-IN')} Dep.</span>
                </div>
              </div>
            </div>

            {/* Product Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-warm-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                  {product.name}
                </h3>
                {product.location && (
                  <div className="flex items-center gap-1 text-xs text-warm-500 mt-1">
                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{product.location}</span>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-warm-500 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-warm-200">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                    }}
                    className="w-full py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-warm-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, undefined, undefined, 7);
                      if (onNavigateToCart) onNavigateToCart();
                    }}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-sky-400 text-warm-900 text-xs font-semibold shadow-md shadow-amber transition-all flex items-center justify-center gap-1.5"
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
