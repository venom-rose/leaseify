import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck, ArrowRight, AlertCircle, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

export const LoginPage = ({ onNavigateToSignup }) => {
  const { login, verifyOtp, resendOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP Verification States (in case account is unverified)
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [unverifiedUserId, setUnverifiedUserId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

  // Status States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (otpResendCooldown > 0) {
      timer = setTimeout(() => setOtpResendCooldown(otpResendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    if (!res.success) {
      if (res.isUnverified) {
        setUnverifiedUserId(res.email || email);
        setShowOtpScreen(true);
        setOtpResendCooldown(60);
        setOtpSuccessMessage('Your email is unverified. We have sent a verification code to your email.');
      } else {
        setError(res.message || 'Invalid email or password. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(unverifiedUserId || email, otpCode);
    if (!res.success) {
      setError(res.message || 'OTP verification failed. Please try again.');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (otpResendCooldown > 0) return;
    
    setError('');
    setOtpSuccessMessage('');
    setLoading(true);
    
    const res = await resendOtp(unverifiedUserId || email);
    if (res.success) {
      setOtpSuccessMessage('A fresh verification OTP has been sent to your email.');
      setOtpResendCooldown(60);
    } else {
      setError(res.message || 'Failed to resend verification OTP.');
    }
    setLoading(false);
  };

  const handleQuickFill = (type) => {
    if (type === 'admin') {
      setEmail('admin@leaseify.com');
      setPassword('password123');
    } else {
      setEmail('tenant@leaseify.com');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FBF9F5 0%, #F5F0E8 100%)' }}>
      {/* Subtle decorative circles */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center mb-3">
          <img
            src="/logo.png"
            alt="Leaseify.co Logo"
            className="h-20 w-20 rounded-3xl object-cover shadow-xl ring-2 ring-amber-200"
          />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-warm-900">
          Lease<span className="text-amber-500">ify</span><span className="text-amber-600">.co</span>
        </h1>
        <p className="mt-1 text-sm text-warm-500 font-medium">
          Lease your Luxury
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-warm-200 shadow-xl space-y-6">
          {!showOtpScreen ? (
            // STANDARD LOGIN CARD
            <>
              <div>
                <h2 className="text-xl font-bold text-warm-900 tracking-tight">Sign In</h2>
                <p className="text-xs text-warm-500 mt-1">
                  Enter your registered credentials to access your portal.
                </p>
              </div>

              {/* Quick Demo Credentials Autofill */}
              <div className="p-3.5 rounded-2xl bg-warm-100 border border-warm-200 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">
                  ⚡ Demo Accounts (Autofill Credentials)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-left transition-all group"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-warm-900 group-hover:text-amber-700 truncate">Manager (Admin)</p>
                      <p className="text-[10px] text-warm-500 truncate">admin@leaseify.com</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('user')}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-left transition-all group"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-warm-900 group-hover:text-emerald-700 truncate">Tenant (Resident)</p>
                      <p className="text-[10px] text-warm-500 truncate">tenant@leaseify.com</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-warm-200 w-full" />
                <span className="bg-white px-3 text-[11px] text-warm-400 uppercase tracking-wider absolute">
                  Or Sign In with Email
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-warm-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-warm-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@leaseify.com"
                      className="w-full pl-10 pr-3 py-2.5 input-warm rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-warm-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 input-warm rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-warm-400 hover:text-warm-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 btn-amber rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center border-t border-warm-200">
                <p className="text-xs text-warm-500">
                  Don't have an account yet?{' '}
                  <button
                    onClick={onNavigateToSignup}
                    className="font-semibold text-amber-600 hover:text-amber-700 hover:underline ml-1"
                  >
                    Sign up as Tenant
                  </button>
                </p>
              </div>
            </>
          ) : (
            // INLINE OTP VERIFICATION CARD FOR UNVERIFIED LOGINS
            <>
              <div>
                <h2 className="text-xl font-bold text-warm-900 tracking-tight">Verify Your Identity</h2>
                <p className="text-xs text-warm-500 mt-1">
                  We've sent a 6-digit One-Time Password (OTP) to your email <strong className="text-warm-850 font-bold">{email}</strong> to activate your account.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {otpSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{otpSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-warm-700 mb-1.5 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="relative max-w-[240px] mx-auto">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-warm-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full pl-10 pr-3 py-2.5 input-warm rounded-xl text-center text-lg font-bold tracking-[8px] placeholder-warm-300 placeholder:tracking-normal"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 btn-amber rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Verifying OTP...' : 'Verify & Activate Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-4 text-center border-t border-warm-200 flex flex-col items-center gap-3">
                <p className="text-xs text-warm-500">
                  Didn't receive the email verification code?
                </p>
                <button
                  type="button"
                  disabled={otpResendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:text-warm-400 disabled:no-underline transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {otpResendCooldown > 0 
                      ? `Resend OTP in ${otpResendCooldown}s` 
                      : 'Resend OTP Code'}
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowOtpScreen(false)}
                  className="text-xs text-warm-400 hover:text-warm-600 underline mt-2"
                >
                  Cancel and Sign In Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
