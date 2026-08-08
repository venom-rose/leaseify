import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';

export const AuthModal = () => {
  const { authModalOpen, setAuthModalOpen, login, register, switchRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register({ name, email, password, role, phone });
        if (!res.success) setError(res.message);
        else setAuthModalOpen(false);
      } else {
        const res = await login(email, password);
        if (!res.success) setError(res.message);
        else setAuthModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (chosenRole) => {
    switchRole(chosenRole);
    setAuthModalOpen(false);
  };

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      title={isRegister ? 'Create Leaseify Account' : 'Sign in to Leaseify'}
      maxWidth="max-w-md"
    >
      {/* 1-Click Quick Demo Switcher */}
      <div className="mb-6 p-4 rounded-xl bg-warm-50/70 border border-warm-200">
        <p className="text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
          ⚡ 1-Click Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect('admin')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 hover:bg-amber-100 text-left transition-all group"
          >
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-warm-900 group-hover:text-amber-700">Manager (Admin)</p>
              <p className="text-[10px] text-warm-500">admin@leaseify.com</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('user')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-50 text-left transition-all group"
          >
            <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-warm-900 group-hover:text-emerald-600">Tenant (Alex)</p>
              <p className="text-[10px] text-warm-500">tenant@leaseify.com</p>
            </div>
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-warm-200 w-full" />
        <span className="bg-white px-3 text-[11px] text-warm-400 uppercase tracking-wider">
          Or Enter Credentials
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isRegister && (
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full pl-9 pr-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@leaseify.com"
              className="w-full pl-9 pr-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-warm-600 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {isRegister && (
          <>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Phone (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-warm-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-center ${
                    role === 'user'
                      ? 'bg-amber-500/20 border-sky-500 text-amber-500'
                      : 'bg-warm-50 border-warm-200 text-warm-500'
                  }`}
                >
                  Tenant / Resident
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-center ${
                    role === 'admin'
                      ? 'bg-amber-100 border-purple-500 text-amber-700'
                      : 'bg-warm-50 border-warm-200 text-warm-500'
                  }`}
                >
                  Property Admin
                </button>
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 text-warm-900 font-semibold rounded-xl text-sm shadow-lg shadow-amber transition-all disabled:opacity-50"
        >
          {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-amber-600 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
