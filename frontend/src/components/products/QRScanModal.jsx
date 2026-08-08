import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  Camera,
  RotateCcw,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const QRScanModal = ({ isOpen, onClose, rental, defaultAction = 'pickup', onSuccess }) => {
  if (!rental) return null;

  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [actionType, setActionType] = useState(defaultAction); // 'pickup' | 'return'
  const [error, setError] = useState(null);

  useEffect(() => {
    setActionType(defaultAction);
    setScanSuccess(false);
    setError(null);
  }, [defaultAction, isOpen]);

  const qrCodeToken =
    actionType === 'pickup'
      ? rental.pickupVerificationCode || `PKP-${Math.floor(100000 + Math.random() * 900000)}`
      : rental.returnVerificationCode || `RTN-${Math.floor(100000 + Math.random() * 900000)}`;

  const handleSimulateScan = async () => {
    setScanning(true);
    setError(null);

    setTimeout(async () => {
      try {
        let res;
        if (actionType === 'pickup') {
          res = await api.markAsPicked(rental._id, {
            pickedByName: rental.user?.name || 'Alex Rivera',
            notes: 'Verified via Instant QR Counter Scanner',
          });
        } else {
          res = await api.processReturn(rental._id, {
            returnDate: new Date().toISOString().split('T')[0],
            itemCondition: 'excellent',
            conditionNotes: 'Scanned and verified via Counter Return Scanner',
            damagePenalty: 0,
          });
        }

        if (res && res.success) {
          setScanning(false);
          setScanSuccess(true);
          onSuccess?.(res.data);
          setTimeout(() => {
            onClose();
          }, 1800);
        } else {
          setScanning(false);
          setError(res?.message || 'QR Scan authorization failed');
        }
      } catch (err) {
        setScanning(false);
        setError(err.message || 'Verification failed');
      }
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR Code Logistics Verification"
      maxWidth="max-w-md"
    >
      <div className="space-y-5 text-center">
        {/* Toggle Mode: Pickup vs Return */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActionType('pickup');
              setScanSuccess(false);
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              actionType === 'pickup'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Pickup Handover</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionType('return');
              setScanSuccess(false);
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              actionType === 'return'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return Intake</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Viewfinder Camera Simulation / QR Pass Display */}
        <div className="relative mx-auto w-56 h-56 rounded-3xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4 group">
          {/* Laser Scanner animation line when scanning */}
          {scanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-bounce z-20 top-0 bottom-0 m-auto" />
          )}

          {scanSuccess ? (
            <div className="space-y-2 animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-emerald-400">Verified & Approved!</p>
              <p className="text-[11px] text-slate-400">
                {actionType === 'pickup' ? 'Rental marked as Picked' : 'Deposit refund triggered'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center justify-center">
              {/* Stylized QR Code Visual */}
              <div className="relative p-3 bg-white rounded-2xl shadow-xl">
                <QrCode className="w-24 h-24 text-slate-950" />
                <div className="absolute inset-0 m-auto w-6 h-6 rounded-md bg-sky-500 text-white flex items-center justify-center shadow">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <span className="font-mono text-xs font-black tracking-widest text-sky-400 uppercase">
                  {qrCodeToken}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Order #{rental.transactionId || 'RNT-990'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Simulate Scanner Trigger */}
        {!scanSuccess && (
          <button
            type="button"
            disabled={scanning}
            onClick={handleSimulateScan}
            className={`w-full py-3 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
              actionType === 'pickup'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/25'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25'
            } disabled:opacity-50`}
          >
            <Camera className="w-4 h-4" />
            <span>
              {scanning
                ? 'Scanning QR Barcode...'
                : actionType === 'pickup'
                ? 'Simulate Counter QR Pickup Scan'
                : 'Simulate Counter QR Return Scan'}
            </span>
          </button>
        )}

        <p className="text-[11px] text-slate-500">
          📱 Present this QR token at the logistics desk or scan using staff scanner PDA.
        </p>
      </div>
    </Modal>
  );
};
