import { useState, useRef } from 'react';
import { ScanLine, CheckCircle, Download, Send, AlertTriangle, Loader2, CloudOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../DataContext';
import { getInitials, getInitialsBg } from '../utils/initials';
import { Attendee } from '../types';
import { isGoogleSheetsConfigured } from '../googleSheets';

export default function RegistrationForm() {
  const { addAttendee, synced } = useData();
  const [form, setForm] = useState({ name: '', email: '', department: '', position: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const sheetConfigured = isGoogleSheetsConfigured();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.department.trim()) errs.department = 'Department/Office is required';
    if (!form.position.trim()) errs.position = 'Position is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const attendee = await addAttendee({
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
        phone: form.phone.trim(),
      });

      setCreatedAttendee(attendee);
      setSubmitted(true);
    } catch (err) {
      console.error('Registration failed:', err);
      setSubmitError('Failed to save registration. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadQR = () => {
    if (!createdAttendee || !qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        const link = document.createElement('a');
        link.download = `QR-${createdAttendee.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRegisterAnother = () => {
    setForm({ name: '', email: '', department: '', position: '', phone: '' });
    setErrors({});
    setSubmitted(false);
    setSubmitError(null);
    setCreatedAttendee(null);
  };

  const previewInitials = form.name.trim() ? getInitials(form.name) : '?';
  const previewBg = form.name.trim() ? getInitialsBg(form.name) : 'bg-gray-400';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
              <ScanLine size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white text-sm leading-tight">AttendEase</h1>
              <p className="text-[9px] text-gray-400 dark:text-slate-500 leading-tight">Attendee Registration</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {!submitted ? (
          /* ─── Registration Form ─── */
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Register as Attendee</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Fill in your details to get your attendance QR code</p>
            </div>

            {/* Connection status */}
            {!sheetConfigured && (
              <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-center gap-2.5">
                <CloudOff size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Registration is offline. Data will be saved locally on this device only. Contact the admin to enable cloud sync.
                </p>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
              {/* Live preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl mb-5">
                <div className={`w-12 h-12 rounded-full ${previewBg} flex items-center justify-center text-white text-lg font-bold transition-colors`}>
                  {previewInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 dark:text-slate-300 text-sm truncate">{form.name.trim() || 'Your Name'}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                    {form.department.trim() || 'Department'} · {form.position.trim() || 'Position'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                    {form.email.trim() || 'email'} · {form.phone.trim() || 'phone'}
                  </p>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-400">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} placeholder="Juan Dela Cruz" required disabled={submitting} />
                <Field label="Email (optional)" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} error={errors.email} placeholder="juan@company.com" disabled={submitting} />
                <Field label="Department/Office" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} error={errors.department} placeholder="Sangguniang Panlalawigan Office" required disabled={submitting} />
                <Field label="Position" value={form.position} onChange={v => setForm(f => ({ ...f, position: v }))} error={errors.position} placeholder="Legislative Staff" required disabled={submitting} />
                <Field label="Phone (optional)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+63 912 345 6789" disabled={submitting} />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30 text-base mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving to database…
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Registration
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-[11px] text-gray-400 dark:text-slate-500">
              Your QR code will be shown after submitting. Save it for attendance check-in.
            </p>
          </div>
        ) : createdAttendee ? (
          /* ─── Success + QR Code ─── */
          <div className="space-y-5 animate-fade-in">
            {/* Success Banner */}
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-2xl p-5 text-center">
              <CheckCircle size={40} className="text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Registration Successful!</h2>
              <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                {synced ? 'Your data has been saved to the database.' : 'Your data has been saved locally.'}
              </p>
            </div>

            {/* Saved-to confirmation */}
            {synced && (
              <div className="flex items-center justify-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 py-2 rounded-lg">
                <CheckCircle size={14} />
                Saved to Google Sheets ✓
              </div>
            )}

            {/* Attendee Card + QR */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center">
              <div className={`w-16 h-16 rounded-full ${getInitialsBg(createdAttendee.name)} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3`}>
                {getInitials(createdAttendee.name)}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{createdAttendee.name}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{createdAttendee.department} · {createdAttendee.position}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{createdAttendee.email || 'No email'} · {createdAttendee.phone || 'No phone'}</p>

              {/* QR Code */}
              <div ref={qrRef} className="inline-block bg-white p-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-600 mt-5">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: createdAttendee.id,
                    name: createdAttendee.name,
                    email: createdAttendee.email,
                    department: createdAttendee.department,
                  })}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#1e40af"
                  bgColor="#ffffff"
                />
              </div>

              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
                Screenshot or download this QR code for attendance scanning
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-5">
                <button
                  onClick={handleDownloadQR}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                >
                  <Download size={18} />
                  Download QR Code
                </button>
                <button
                  onClick={handleRegisterAnother}
                  className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-3 rounded-xl font-medium transition-all"
                >
                  Register Another Person
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-400 dark:text-slate-500">
              Present this QR code when checking in for attendance.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, error, placeholder, type = 'text', required, disabled }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; type?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          error
            ? 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 bg-orange-50 dark:bg-orange-950/30'
            : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800'
        } dark:text-white dark:placeholder-slate-500`}
      />
      {error && <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
