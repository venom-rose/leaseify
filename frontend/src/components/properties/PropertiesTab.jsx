import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Search,
  Plus,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Tag,
  DollarSign,
  User,
  Filter,
  CheckCircle,
  Eye,
} from 'lucide-react';

export const PropertiesTab = ({ isAddModalOpen, setIsAddModalOpen }) => {
  const { role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Form State for Add Property
  const [formData, setFormData] = useState({
    title: '',
    type: 'Apartment',
    rentAmount: '',
    securityDeposit: '',
    bedrooms: 2,
    bathrooms: 2,
    areaSqFt: '',
    address: {
      street: '',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94107',
    },
    description: '',
    amenities: 'High Speed WiFi, Parking, In-Unit Washer/Dryer, Smart Lock',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    fetchProperties();
  }, [search, statusFilter, typeFilter]);

  const fetchProperties = async () => {
    setLoading(true);
    const res = await api.getProperties({
      search,
      status: statusFilter,
      type: typeFilter,
    });
    if (res.success) {
      setProperties(res.data);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      type: formData.type,
      rentAmount: Number(formData.rentAmount),
      securityDeposit: Number(formData.securityDeposit || formData.rentAmount),
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      areaSqFt: Number(formData.areaSqFt),
      address: formData.address,
      description: formData.description,
      amenities: formData.amenities.split(',').map((s) => s.trim()),
      images: [formData.imageUrl],
      status: 'available',
    };

    const res = await api.createProperty(payload);
    if (res.success) {
      setIsAddModalOpen(false);
      fetchProperties();
      setFormData({
        title: '',
        type: 'Apartment',
        rentAmount: '',
        securityDeposit: '',
        bedrooms: 2,
        bathrooms: 2,
        areaSqFt: '',
        address: { street: '', city: 'San Francisco', state: 'CA', zipCode: '94107' },
        description: '',
        amenities: 'High Speed WiFi, Parking, In-Unit Washer/Dryer, Smart Lock',
        imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Property Catalog</h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse, manage, and list residential and commercial units.
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Property
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, city, street..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="available" className="bg-slate-900">Available</option>
              <option value="rented" className="bg-slate-900">Rented</option>
              <option value="maintenance" className="bg-slate-900">Maintenance</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Types</option>
              <option value="Apartment" className="bg-slate-900">Apartment</option>
              <option value="Condo" className="bg-slate-900">Condo</option>
              <option value="Single Family Home" className="bg-slate-900">Single Family Home</option>
              <option value="Studio" className="bg-slate-900">Studio</option>
              <option value="Townhouse" className="bg-slate-900">Townhouse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <div
            key={property._id}
            className="group glass-panel rounded-2xl overflow-hidden border border-slate-800/90 hover:border-slate-700 hover:shadow-2xl transition-all flex flex-col"
          >
            {/* Property Image & Status Pill */}
            <div className="relative h-48 w-full overflow-hidden bg-slate-950">
              <img
                src={property.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

              <div className="absolute top-3 left-3">
                <Badge variant={property.status}>{property.status}</Badge>
              </div>

              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-semibold text-white">
                {property.type}
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-bold text-white tracking-tight">
                    ₹{property.rentAmount?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-300"> / month</span>
                </div>
                {property.securityDeposit > 0 && (
                  <span className="text-[11px] text-slate-300">
                    Deposit: ₹{property.securityDeposit?.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Property Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-sky-400 transition-colors">
                  {property.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">
                    {property.address?.city}, {property.address?.state} {property.address?.zipCode}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" /> {property.bedrooms} Beds
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" /> {property.bathrooms} Baths
                </span>
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" /> {property.areaSqFt} sq ft
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <Modal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          title={selectedProperty.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-950">
              <img
                src={selectedProperty.images?.[0]}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedProperty.status}>{selectedProperty.status}</Badge>
                <span className="text-xs text-slate-400">Type: {selectedProperty.type}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">
                  ₹{selectedProperty.rentAmount?.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{selectedProperty.description}</p>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs">
              <div>
                <p className="text-slate-500">Bedrooms</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedProperty.bedrooms}</p>
              </div>
              <div>
                <p className="text-slate-500">Bathrooms</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedProperty.bathrooms}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Area</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedProperty.areaSqFt} sq ft</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Included Amenities
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedProperty.amenities || []).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Property Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property Listing"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Property Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Sunset Luxury Residences Unit 12B"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="Apartment">Apartment</option>
                <option value="Condo">Condo</option>
                <option value="Single Family Home">Single Family Home</option>
                <option value="Studio">Studio</option>
                <option value="Townhouse">Townhouse</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                required
                min="0"
                placeholder="25000"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="50000"
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bedrooms</label>
              <input
                type="number"
                required
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bathrooms</label>
              <input
                type="number"
                required
                step="0.5"
                min="1"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Area (sq ft)</label>
              <input
                type="number"
                required
                min="100"
                placeholder="1100"
                value={formData.areaSqFt}
                onChange={(e) => setFormData({ ...formData, areaSqFt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Street Address</label>
              <input
                type="text"
                required
                placeholder="e.g. 500 Market Street"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City, State</label>
              <input
                type="text"
                required
                placeholder="San Francisco, CA"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows="3"
              required
              placeholder="Describe the unit features, views, proximity to amenities..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amenities (comma-separated)</label>
            <input
              type="text"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            Create Property Listing
          </button>
        </form>
      </Modal>
    </div>
  );
};
