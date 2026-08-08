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
        <div className="grid grid-cols-2 gap-1 bg-warm-50 p-1 rounded-2xl border border-warm-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setActionType('pickup');
              setScanSuccess(false);
            }}
            className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              actionType === 'pickup'
                ? 'bg-amber-500 text-warm-900 shadow-md shadow-amber'
                : 'text-warm-500 hover:text-warm-900'
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
                ? 'bg-emerald-500 text-warm-900 shadow-md shadow-amber'
                : 'text-warm-500 hover:text-warm-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return Intake</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Viewfinder Camera Simulation / QR Pass Display */}
        <div className="relative mx-auto w-56 h-56 rounded-3xl bg-warm-50 border-2 border-warm-200 overflow-hidden flex flex-col items-center justify-center p-4 group">
          {/* Laser Scanner animation line when scanning */}
          {scanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-bounce z-20 top-0 bottom-0 m-auto" />
          )}

          {scanSuccess ? (
            <div className="space-y-2 animate-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-emerald-600">Verified & Approved!</p>
              <p className="text-[11px] text-warm-500">
                {actionType === 'pickup' ? 'Rental marked as Picked' : 'Deposit refund triggered'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center justify-center">
              {/* Stylized QR Code Visual */}
              <div className="relative p-3 bg-white rounded-2xl shadow-xl">
                <QrCode className="w-24 h-24 text-slate-950" />
                <div className="absolute inset-0 m-auto w-6 h-6 rounded-md bg-amber-500 text-warm-900 flex items-center justify-center shadow">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <span className="font-mono text-xs font-black tracking-widest text-amber-600 uppercase">
                  {qrCodeToken}
                </span>
                <p className="text-[10px] text-warm-400 mt-0.5">
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
            className={`w-full py-3 text-warm-900 font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
              actionType === 'pickup'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-sky-400 hover:to-indigo-500 shadow-amber'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-emerald-400 hover:to-teal-500 shadow-amber'
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

        <p className="text-[11px] text-warm-400">
          📱 Present this QR token at the logistics desk or scan using staff scanner PDA.
        </p>
      </div>
    </Modal>
  );
};
