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

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Sort state
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6); // Show 6 per page for clear pagination view
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryFilter, minPrice, maxPrice, locationFilter, sortField, sortOrder]);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await api.getProducts({
      page,
      limit,
      search,
      category: categoryFilter,
      minPrice,
      maxPrice,
      location: locationFilter,
      sort: sortField,
      order: sortOrder,
    });
    if (res.success) {
      setProducts(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalItems || 0);
    }
    setLoading(false);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleMinPriceChange = (value) => {
    setMinPrice(value);
    setPage(1);
  };

  const handleMaxPriceChange = (value) => {
    setMaxPrice(value);
    setPage(1);
  };

  const handleLocationChange = (value) => {
    setLocationFilter(value);
    setPage(1);
  };

  const handleSortChange = (value) => {
    const [field, order] = value.split('-');
    setSortField(field);
    setSortOrder(order);
    setPage(1);
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

      {/* Premium Glassmorphic Filters & Sorting Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-warm-200/80 space-y-4 shadow-sm">
        {/* Row 1: Search, Sorting & Toggle Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search input */}
          <div className="relative md:col-span-6 w-full">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-warm-500" />
            <input
              type="text"
              placeholder="Search items by name, title, or location..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>

          {/* Sorting Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500 cursor-pointer transition-all font-semibold"
            >
              <option value="createdAt-desc">Newest Listings</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3 w-full">
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 capitalize focus:outline-none focus:border-amber-500 cursor-pointer transition-all font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c !== 'all').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Price range inputs & Location Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-warm-200/60">
          {/* Price Range inputs */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block">Price Range (₹ / Day)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs text-warm-500">₹</span>
                <input
                  type="number"
                  placeholder="Min Price"
                  value={minPrice}
                  onChange={(e) => handleMinPriceChange(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500"
                />
              </div>
              <span className="text-xs text-warm-400 font-medium">to</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs text-warm-500">₹</span>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={maxPrice}
                  onChange={(e) => handleMaxPriceChange(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Location input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-warm-500 block">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2 w-4 h-4 text-warm-500" />
              <input
                type="text"
                placeholder="Enter city or hub name..."
                value={locationFilter}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/5 border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-warm-500">Loading catalog items...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel text-center py-16 px-6 rounded-2xl border border-warm-200 flex flex-col items-center justify-center space-y-3">
          <Package className="w-10 h-10 text-warm-400" />
          <h3 className="text-sm font-bold text-warm-800">No Rental Products Found</h3>
          <p className="text-xs text-warm-500 max-w-xs">
            We couldn't find any products matching your search terms or filters. Try resetting the filters or modifying your search keyword.
          </p>
        </div>
      ) : (
        <>
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
                      <span className="text-2xl font-black text-warm-900 tracking-tight font-mono">
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-warm-200 pt-6 mt-4 gap-4">
              <div className="text-xs text-warm-500">
                Showing page <span className="font-semibold text-warm-900">{page}</span> of <span className="font-semibold text-warm-900">{totalPages}</span> ({totalItems} total items)
              </div>
              <div className="flex items-center gap-1.5">
                {/* Previous button */}
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    page === 1
                      ? 'bg-warm-100 border-warm-200 text-warm-400 cursor-not-allowed'
                      : 'bg-white border-warm-200 text-warm-700 hover:bg-warm-50 hover:text-warm-900 shadow-sm'
                  }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      page === pageNum
                        ? 'bg-amber-500 text-warm-900 shadow-md shadow-amber'
                        : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50 hover:text-warm-900 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next button */}
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    page === totalPages
                      ? 'bg-warm-100 border-warm-200 text-warm-400 cursor-not-allowed'
                      : 'bg-white border-warm-200 text-warm-700 hover:bg-warm-50 hover:text-warm-900 shadow-sm'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
