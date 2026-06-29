import { useState, useRef, useEffect, useMemo } from 'react';
import { ScanLine, Lock, Eye, EyeOff, Loader2, CloudOff } from 'lucide-react';
import { fetchAdminPins, isGoogleSheetsConfigured } from '../googleSheets';

// Hidden fallback PIN used only when Google Sheets is not configured or unreachable.
const FALLBACK_PIN = '1234';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loadingPins, setLoadingPins] = useState(true);
  const [sheetUnavailable, setSheetUnavailable] = useState(false);
  const [allowedPins, setAllowedPins] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sheetsConfigured = isGoogleSheetsConfigured();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let active = true;

    const loadPins = async () => {
      if (!sheetsConfigured) {
        if (active) {
          setAllowedPins([FALLBACK_PIN]);
          setLoadingPins(false);
        }
        return;
      }

      try {
        const pins = await fetchAdminPins();
        if (!active) return;

        if (pins.length > 0) {
          setAllowedPins(pins);
          setSheetUnavailable(false);
        } else {
          setAllowedPins([FALLBACK_PIN]);
          setSheetUnavailable(true);
        }
      } catch (err) {
        console.error('Failed to fetch admin PINs:', err);
        if (!active) return;
        setAllowedPins([FALLBACK_PIN]);
        setSheetUnavailable(true);
      } finally {
        if (active) setLoadingPins(false);
      }
    };

    loadPins();
    return () => {
      active = false;
    };
  }, [sheetsConfigured]);

  const normalizedAllowedPins = useMemo(
    () => allowedPins.map(p => String(p).trim().padStart(4, '0')),
    [allowedPins],
  );

  const failPin = () => {
    setError(true);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }, 600);
  };

  const tryLogin = (fullPin: string) => {
    const normalized = fullPin.trim().padStart(4, '0');
    if (normalizedAllowedPins.includes(normalized)) {
      sessionStorage.setItem('attendease_auth', 'true');
      onLogin();
    } else {
      failPin();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(false);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 3) {
      tryLogin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newPin = pasted.split('');
      setPin(newPin);
      setError(false);
      tryLogin(pasted);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ScanLine size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AttendEase</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">QR Attendance System</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Lock size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Admin Login</h2>
          </div>

          <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
            Enter the 4-digit PIN to access the dashboard
          </p>

          {sheetUnavailable && sheetsConfigured && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-2.5">
              <CloudOff size={16} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Could not load admin PINs from Google Sheets. Using local fallback access on this device.
              </p>
            </div>
          )}

          <div className={`flex justify-center gap-3 mb-6 ${shaking ? 'animate-shake' : ''}`}>
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={loadingPins}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  error
                    ? 'border-red-400 dark:border-red-600 focus:ring-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                    : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-800 dark:text-white'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setShowPin(!showPin)}
            disabled={loadingPins}
            className="flex items-center justify-center gap-1.5 mx-auto text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors mb-4 disabled:opacity-50"
          >
            {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPin ? 'Hide PIN' : 'Show PIN'}
          </button>

          {loadingPins && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400 animate-fade-in">
              <Loader2 size={16} className="animate-spin" />
              Loading admin PIN…
            </div>
          )}

          {!loadingPins && error && (
            <p className="text-center text-sm text-red-600 dark:text-red-400 font-medium animate-fade-in">
              Incorrect PIN. Try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem('attendease_auth') === 'true';
}

export function logout() {
  sessionStorage.removeItem('attendease_auth');
}
