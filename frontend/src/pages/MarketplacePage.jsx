import React, { useState } from 'react';
import { Search, Sparkles, Grid, Flame, Zap, Laptop, Tv, Armchair, Wrench, Bike, Speaker, Filter, ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function MarketplacePage() {
  const { showToast } = useApp();
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  const categories = [
    { id: 'electronics', name: 'Electronics & Gadgets', icon: Laptop, count: 12 },
    { id: 'appliances', name: 'Home Appliances', icon: Tv, count: 8 },
    { id: 'furniture', name: 'Furniture & Living', icon: Armchair, count: 15 },
    { id: 'household', name: 'Household & Tools', icon: Wrench, count: 20 },
    { id: 'vehicles', name: 'Vehicles & Mobility', icon: Bike, count: 6 },
    { id: 'events', name: 'Event & Party Gear', icon: Speaker, count: 10 }
  ];

  const allProducts = [
    {
      id: 1,
      name: 'MacBook Pro 16" M3 Max (32GB / 1TB SSD)',
      category: 'Electronics & Gadgets',
      catId: 'electronics',
      brand: 'Apple',
      daily_rate: 45,
      deposit: 300,
      stock: 4,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200'
    },
    {
      id: 2,
      name: 'Sony Alpha A7 IV 4K Mirrorless Camera + Lens',
      category: 'Electronics & Gadgets',
      catId: 'electronics',
      brand: 'Sony',
      daily_rate: 35,
      deposit: 250,
      stock: 3,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200'
    },
    {
      id: 3,
      name: 'LG 450L Smart Inverter Refrigerator',
      category: 'Home Appliances',
      catId: 'appliances',
      brand: 'LG',
      daily_rate: 25,
      deposit: 150,
      stock: 0,
      image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=1200'
    },
    {
      id: 4,
      name: 'Dyson V15 Detect Cordless Vacuum Cleaner',
      category: 'Household & Tools',
      catId: 'household',
      brand: 'Dyson',
      daily_rate: 15,
      deposit: 80,
      stock: 8,
      image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200'
    },
    {
      id: 5,
      name: 'Herman Miller Aeron Ergonomic Office Desk Chair',
      category: 'Furniture & Living',
      catId: 'furniture',
      brand: 'Herman Miller',
      daily_rate: 20,
      deposit: 120,
      stock: 9,
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=1200'
    },
    {
      id: 6,
      name: 'Tesla Model 3 Long Range EV Sedan',
      category: 'Vehicles & Mobility',
      catId: 'vehicles',
      brand: 'Tesla',
      daily_rate: 85,
      deposit: 500,
      stock: 2,
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200'
    }
  ];

  // Search & Filter Logic
  let filtered = allProducts.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.catId === selectedCat;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = inStockOnly ? p.stock > 0 : true;
    return matchesCat && matchesSearch && matchesStock;
  });

  if (sortBy === 'low') {
    filtered.sort((a, b) => a.daily_rate - b.daily_rate);
  } else if (sortBy === 'high') {
    filtered.sort((a, b) => b.daily_rate - a.daily_rate);
  }

  return (
    <div className="view-section" style={{ display: 'block' }}>
      {/* Hero SaaS Banner */}
      <div className="concept-hero">
        <div className="hero-glow-bg" />
        <div className="hero-left" style={{ maxWidth: '100%' }}>
          <div className="hero-badge">
            <Sparkles style={{ width: 14, height: 14 }} /> NEXT-GEN RENTAL MARKETPLACE
          </div>
          <h1 className="hero-headline">
            RENT ANYTHING.<br />
            <span className="gradient-text">ELECTRONICS, APPLIANCES & MORE.</span>
          </h1>
          <p className="hero-description">
            Rent high-performance laptops, 4K cameras, smart refrigerators, ergonomic office furniture, power tools, electric scooters & party gear with instant escrow protection.
          </p>

          {/* Search Bar & Filter Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', maxWidth: 750, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-dim)', width: 20, height: 20 }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search laptops, fridges, cameras, chairs, tools, scooters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 48, height: 48, borderRadius: 50, fontSize: '0.95rem' }}
              />
            </div>

            {/* Sort Selector */}
            <select
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: 170, height: 48, borderRadius: 50, paddingLeft: 16, cursor: 'pointer' }}
            >
              <option value="default">Sort: Recommended</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Amazon-Style Category Grid */}
      <div style={{ margin: '2rem 0 1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Grid style={{ width: 20, height: 20, color: 'var(--gold)' }} /> Shop by Category
        </h3>

        <div className="amazon-category-grid">
          <div
            className={`amazon-cat-card ${selectedCat === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCat('all')}
          >
            <div className="amazon-cat-icon-box"><Grid style={{ width: 26, height: 26 }} /></div>
            <div className="amazon-cat-title">All Products</div>
            <div className="amazon-cat-count">{allProducts.length} Items</div>
          </div>

          {categories.map((c) => {
            const IconComp = c.icon;
            const isActive = selectedCat === c.id;
            return (
              <div
                key={c.id}
                className={`amazon-cat-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCat(c.id)}
              >
                <div className="amazon-cat-icon-box">
                  <IconComp style={{ width: 26, height: 26 }} />
                </div>
                <div className="amazon-cat-title">{c.name}</div>
                <div className="amazon-cat-count">{c.count} Available</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <section className="featured-section animate-fade-in">
        <div className="featured-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="featured-badge-pill">
              <Flame style={{ width: 14, height: 14 }} /> CATALOG SHOWCASE
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Available Rentals ({filtered.length})
            </h2>
          </div>

          {/* In Stock Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            In Stock Only
          </label>
        </div>

        <div className="featured-grid">
          {filtered.map((item) => (
            <div key={item.id} className="saas-product-card">
              <div className="saas-card-img-box">
                <img src={item.image} alt={item.name} loading="lazy" />
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span className={`stock-indicator ${item.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>

              <div className="saas-card-body">
                <div className="saas-card-category">{item.category} &bull; {item.brand}</div>
                <h3 className="saas-card-title">{item.name}</h3>
                <div className="saas-price-tag">
                  <span className="saas-price-val">${item.daily_rate}</span>
                  <span className="saas-price-unit">/ day</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  Deposit: <strong style={{ color: 'var(--gold)' }}>${item.deposit.toFixed(2)}</strong>
                </div>
                <button
                  className="btn btn-gold btn-sm"
                  style={{ width: '100%', borderRadius: 8 }}
                  disabled={item.stock === 0}
                  onClick={() => showToast(`Reservation initialized for ${item.name}!`, 'success')}
                >
                  <Zap style={{ width: 14, height: 14 }} /> {item.stock > 0 ? 'Instant Book' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
