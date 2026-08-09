import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { User, Phone, Calendar, Heart, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Initialize fields on open
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setPhone(user.phone || '');
      
      // Format Date of Birth to YYYY-MM-DD for date input
      if (user.dob) {
        setDob(new Date(user.dob).toISOString().split('T')[0]);
      } else {
        setDob('');
      }

      setEmergencyName(user.emergencyContact?.name || '');
      setEmergencyPhone(user.emergencyContact?.phone || '');
      setEmergencyRelation(user.emergencyContact?.relationship || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const payload = {
      name,
      avatar,
      phone,
      dob: dob || null,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelation,
      },
    };

    const res = await updateProfile(payload);
    setLoading(false);
    
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(res.message || 'Failed to update profile settings.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile Settings" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Picture Preview & Input */}
        <div className="flex flex-col items-center gap-3 bg-warm-50 p-4 rounded-2xl border border-warm-200">
          <img
            src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt="Profile Preview"
            className="w-20 h-20 rounded-full object-cover border-2 border-amber-500 ring-4 ring-amber-100/50 shadow-md"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
            }}
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-warm-650 mb-1">
              Profile Photo URL
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="Paste an Unsplash image URL or any web link..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-500 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Profile settings updated successfully!</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-3.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-warm-500">
            Personal Information
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-warm-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-warm-700 mb-1">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-warm-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-3.5 pt-2 border-t border-warm-200">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-warm-500">
            Emergency Contact
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Contact Name */}
            <div>
              <label className="block text-xs font-medium text-warm-700 mb-1">Contact Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Contact Full Name"
                  className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs font-medium text-warm-700 mb-1">Relationship</label>
              <div className="relative">
                <Heart className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Spouse, Parent, Friend"
                  className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-medium text-warm-700 mb-1">Contact Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Contact Phone Number"
                className="w-full pl-9 pr-3 py-2 bg-warm-50/50 border border-warm-200 rounded-xl text-xs text-warm-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-warm-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-warm-200 text-warm-700 hover:bg-warm-50 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 font-bold rounded-xl text-xs shadow-lg shadow-amber transition-all disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
