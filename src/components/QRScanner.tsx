import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { Attendee, AttendanceRecord } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';
import AttendeeSearch from './AttendeeSearch';

interface PendingScan {
  attendee: Attendee;
  actionType: 'check-in' | 'check-out';
}

export default function QRScanner() {
  const { getAttendeeById, addRecord, getAttendeeLastAction } = useData();

  const [isScanning, setIsScanning] = useState(false);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; detail?: string; record?: AttendanceRecord } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current.getState();
        if (s === 2) await scannerRef.current.stop();
      } catch { /* */ }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    try {
      const data = JSON.parse(decodedText);
      if (!data.id) {
        setScanFeedback({ type: 'error', message: 'Invalid QR Code', detail: 'No valid attendee data.' });
        setTimeout(() => setScanFeedback(null), 3000);
        return;
      }
      const attendee = getAttendeeById(data.id);
      if (!attendee) {
        setScanFeedback({ type: 'warning', message: 'Attendee Not Found', detail: `ID: ${data.id}` });
        setTimeout(() => setScanFeedback(null), 3000);
        return;
      }
      const lastAction = getAttendeeLastAction(data.id);
      const actionType: 'check-in' | 'check-out' = lastAction && lastAction.type === 'check-in' ? 'check-out' : 'check-in';
      void stopScanner();
      setPendingScan({ attendee, actionType });
    } catch {
      setScanFeedback({ type: 'error', message: 'Invalid QR Code', detail: 'Could not parse QR data.' });
      setTimeout(() => setScanFeedback(null), 3000);
    }
  }, [getAttendeeById, getAttendeeLastAction, stopScanner]);

  const confirmScan = async () => {
    if (!pendingScan) return;
    const record = await addRecord(pendingScan.attendee, pendingScan.actionType);
    setPendingScan(null);
    setScanFeedback({ type: 'success', message: `${pendingScan.actionType === 'check-in' ? 'Checked In' : 'Checked Out'} Successfully!`, detail: pendingScan.attendee.name, record });
    setTimeout(() => setScanFeedback(null), 4000);
  };

  const cancelScan = () => setPendingScan(null);

  const handleManualSelect = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    const actionType: 'check-in' | 'check-out' = lastAction && lastAction.type === 'check-in' ? 'check-out' : 'check-in';
    setPendingScan({ attendee, actionType });
  };

  const startScanner = useCallback(async () => {
    setCameraError(null); setScanFeedback(null);
    try {
      if (scannerRef.current) {
        try {
          const s = scannerRef.current.getState();
          if (s === 2) await scannerRef.current.stop();
        } catch { /* */ }
      }
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Increased scanner detection box width and height to 350px for larger target acquisition
      await scanner.start(
        { facingMode: 'environment' }, 
        { fps: 15, qrbox: { width: 350, height: 350 }, aspectRatio: 1.0 }, 
        handleScan, 
        () => {}
      );
      setIsScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setCameraError(msg.includes('NotAllowedError') || msg.includes('Permission') ? 'Camera access denied. Please allow camera permission.' : msg.includes('NotFoundError') ? 'No camera found on this device.' : `Camera error: ${msg}`);
      setIsScanning(false);
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const s = scannerRef.current.getState();
          if (s === 2) scannerRef.current.stop();
        } catch { /* */ }
      }
    };
  }, []);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">QR Scanner</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Scan attendee QR codes to record check-in/check-out</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="relative">
          {/* Expanded camera height to 600px dynamic viewport height */}
          <div 
            id="qr-reader" 
            className={`w-full ${isScanning ? 'h-[60vh] min-h-[600px]' : 'h-0 overflow-hidden'}`} 
          />
          
          {!isScanning && !cameraError && !pendingScan && (
            <div className="flex flex-col items-center justify-center h-[60vh] min-h-[500px] py-16 px-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-orange-100 dark:from-blue-900/50 dark:to-orange-900/50 flex items-center justify-center mb-6">
                <Camera size={56} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Ready to Scan</h3>
              <p className="text-gray-500 dark:text-slate-400 text-base text-center max-w-sm mb-8">Point your camera at an attendee's QR code to record attendance</p>
              <button onClick={startScanner} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-medium flex items-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/30 text-xl">
                <Camera size={26} />Start Camera
              </button>
            </div>
          )}

          {cameraError && (
            <div className="flex flex-col items-center justify-center h-[60vh] min-h-[500px] py-16 px-6">
              <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center mb-4">
                <CameraOff size={44} className="text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-orange-700 dark:text-orange-400 mb-2">Camera Error</h3>
              <p className="text-orange-500 dark:text-orange-400 text-base text-center max-w-sm mb-6">{cameraError}</p>
              <button onClick={startScanner} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all text-lg">
                <RotateCcw size={20} />Try Again
              </button>
            </div>
          )}
        </div>

        {isScanning && !pendingScan && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-base font-medium text-gray-700 dark:text-slate-300">Camera Active</span>
              </div>
              <button onClick={stopScanner} className="bg-orange-100 dark:bg-orange-950/50 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-5 py-2.5 rounded-xl text-base font-medium flex items-center gap-2 transition-all">
                <CameraOff size={18} />Stop Camera
              </button>
            </div>
          </div>
        )}

        {scanFeedback && !pendingScan && (
          <div className={`mx-4 mb-4 rounded-xl p-4 flex items-center gap-3 animate-bounce-in ${scanFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-950/50' : scanFeedback.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/50' : 'bg-orange-50 dark:bg-orange-950/50'}`}>
            {scanFeedback.type === 'success' ? <CheckCircle size={24} className="text-green-600 dark:text-green-400 shrink-0" /> : scanFeedback.type === 'warning' ? <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400 shrink-0" /> : <XCircle size={24} className="text-orange-600 dark:text-orange-400 shrink-0" />}
            <div>
              <p className={`font-semibold text-base ${scanFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : scanFeedback.type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' : 'text-orange-800 dark:text-orange-300'}`}>{scanFeedback.message}</p>
              {scanFeedback.detail && <p className={`text-sm mt-0.5 ${scanFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' : scanFeedback.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>{scanFeedback.detail}</p>}
            </div>
          </div>
        )}
      </div>

      {pendingScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-bounce-in">
            <div className="p-6 text-center">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Confirm Attendance</p>
              <div className={`w-16 h-16 rounded-full ${getInitialsBg(pendingScan.attendee.name)} flex items-center justify-center text-white text-xl font-bold mx-auto mb-3`}>
                {getInitials(pendingScan.attendee.name)}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{pendingScan.attendee.name}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{pendingScan.attendee.department} · {pendingScan.attendee.position}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{pendingScan.attendee.email} · {pendingScan.attendee.phone || 'No phone'}</p>
              <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${pendingScan.actionType === 'check-in' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400'}`}>
                {pendingScan.actionType === 'check-in' ? '↓ Check In' : '↑ Check Out'}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              <div className="flex gap-3 mt-5">
                <button onClick={cancelScan} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                <button onClick={confirmScan} className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg ${pendingScan.actionType === 'check-in' ? 'bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-green-900/30' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-orange-900/30'}`}>
                  Confirm {pendingScan.actionType === 'check-in' ? 'Check In' : 'Check Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AttendeeSearch onSelect={handleManualSelect} />
    </div>
  );
}