import React, { useState, useEffect } from 'react';
import { Boxes, Edit, Plus, Loader2, AlertCircle, X, CheckCircle } from 'lucide-react';
import { getProducts, createProduct } from '../services/api';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    pricePerDay: '',
    availability: true
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to fetch inventory from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.pricePerDay) return;

    try {
      setSubmitting(true);
      const newProduct = await createProduct({
        name: formData.name,
        category: formData.category,
        pricePerDay: Number(formData.pricePerDay),
        availability: formData.availability
      });

      setProducts((prev) => [newProduct, ...prev]);
      setIsModalOpen(false);
      setFormData({ name: '', category: 'Electronics', pricePerDay: '', availability: true });
      setSuccessMsg('Product created successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Error creating product: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view-section" style={{ display: 'block' }}>
      {/* Header Bar */}
      <div className="showroom-header-bar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="section-tag">CATALOG & STOCK MANAGEMENT</span>
          <h2 className="section-title">Product Inventory Catalog</h2>
        </div>

        <button className="btn btn-gold btn-sm" style={{ borderRadius: 8 }} onClick={() => setIsModalOpen(true)}>
          <Plus style={{ width: 14, height: 14 }} /> Add New Product
        </button>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--emerald)', borderRadius: 8, color: 'var(--emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle style={{ width: 18, height: 18 }} /> {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose)', borderRadius: 8, color: 'var(--rose)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle style={{ width: 18, height: 18 }} /> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: 'var(--gold)', marginBottom: '0.5rem' }} />
          <div>Fetching real-time inventory from backend...</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Product & Details</th>
                <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                <th style={{ padding: '0.85rem 1rem' }}>Price / Day</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id || p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {p.name}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{p.brand || 'Leaseify Stock'}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge-soft badge-gold">{p.category}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    ${p.pricePerDay || p.daily_rate}/day
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className={`stock-indicator ${p.availability !== false ? 'in-stock' : 'out-stock'}`}>
                      {p.availability !== false ? 'Available' : 'Out of Stock'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <button className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                      <Edit style={{ width: 12, height: 12 }} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Add New Product</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Product Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sony Alpha A7 IV Camera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Category
                </label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Electronics">Electronics & Gadgets</option>
                  <option value="Appliances">Home Appliances</option>
                  <option value="Furniture">Furniture & Living</option>
                  <option value="Household">Household & Tools</option>
                  <option value="Vehicles">Vehicles & Mobility</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Daily Rental Rate ($)
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="35.00"
                  value={formData.pricePerDay}
                  onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
