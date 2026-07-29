import { useState, useRef } from 'react';
import { ScanLine, CheckCircle, Download, Send, AlertTriangle, Loader2, CloudOff, XCircle, HeartHandshake } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../DataContext';
import { getInitials, getInitialsBg } from '../utils/initials';
import { Attendee } from '../types';
import { isGoogleSheetsConfigured } from '../googleSheets';

export default function RegistrationForm() {
  const { addAttendee, synced, eventConfig } = useData();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    department: '', 
    position: '', 
    phone: '',
    willAttend: 'yes',
    reason: '' 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdAttendee, setCreatedAttendee] = useState<Attendee | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const sheetConfigured = isGoogleSheetsConfigured();

  // Dynamic field requirement check helper
  const isReq = (field: 'departmentRequired' | 'positionRequired' | 'phoneRequired' | 'emailRequired') => {
    if (eventConfig?.formFields && eventConfig.formFields[field] !== undefined) {
      return !!eventConfig.formFields[field];
    }
    // Fallback defaults if configuration is unset
    if (field === 'emailRequired') return false;
    return true; // department, position, phone default to required
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (isReq('departmentRequired') && !form.department.trim()) errs.department = 'Department/Office is required';
    if (isReq('positionRequired') && !form.position.trim()) errs.position = 'Position is required';
    if (isReq('phoneRequired') && !form.phone.trim()) errs.phone = 'Phone number is required';
    if (isReq('emailRequired') && !form.email.trim()) errs.email = 'Email address is required';
    
    if (form.willAttend === 'no' && !form.reason.trim()) {
      errs.reason = 'Please state your reason for not attending';
    }

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
        group: '',
        tableNo: '',
        willAttend: form.willAttend === 'yes',
        reason: form.willAttend === 'no' ? form.reason.trim() : '',
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

  const previewInitials = form.name.trim() ? getInitials(form.name) : '?';
  const previewBg = form.name.trim() ? getInitialsBg(form.name) : 'bg-gray-400';

  const isAttending = createdAttendee?.willAttend !== false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      
      {/* ─── Header Banner ─── */}
      <header className="relative min-h-[140px] sm:min-h-[160px] w-full overflow-hidden bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-center">
        {eventConfig?.imageUrl ? (
          <>
            <img
              src={eventConfig.imageUrl}
              alt="Event Header Logo"
              className="w-full h-full object-cover opacity-85 absolute inset-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-orange-500" />
        )}

        <div className="relative max-w-lg mx-auto px-4 py-6 text-center text-white z-10 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 bg-white/20 backdrop-blur-md rounded flex items-center justify-center">
              <ScanLine size={12} className="text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider text-blue-100 uppercase">AttendEase</span>
          </div>

          <h1 className="text-base sm:text-xl font-extrabold text-white drop-shadow uppercase tracking-wide text-center leading-snug whitespace-normal break-words max-w-md">
            {eventConfig?.title || 'Attendee Registration'}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {!submitted ? (
          /* ─── Registration Form ─── */
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Register Attendance</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Fill in your details to confirm your attendance status</p>
            </div>

            {!sheetConfigured && (
              <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-center gap-2.5">
                <CloudOff size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Registration is offline. Data will be saved locally on this device only. Contact the admin to enable cloud sync.
                </p>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
              
              {/* Preview Card */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl mb-5">
                <div className={`w-12 h-12 rounded-full ${previewBg} flex items-center justify-center text-white text-lg font-bold transition-colors shrink-0 mt-0.5`}>
                  {previewInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{form.name.trim() || 'Your Name'}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      form.willAttend === 'yes' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {form.willAttend === 'yes' ? 'Attending' : 'Not Attending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                    {form.department.trim() || 'Department'} · {form.position.trim() || 'Position'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                    {form.email.trim() || 'email'} · {form.phone.trim() || 'phone'}
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-400">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field 
                  label="Full Name" 
                  value={form.name} 
                  onChange={v => setForm(f => ({ ...f, name: v }))} 
                  error={errors.name} 
                  placeholder="Juan Dela Cruz" 
                  required 
                  disabled={submitting} 
                />

                <Field 
                  label={`Department/Office${!isReq('departmentRequired') ? ' (optional)' : ''}`} 
                  value={form.department} 
                  onChange={v => setForm(f => ({ ...f, department: v }))} 
                  error={errors.department} 
                  placeholder="Sangguniang Panlalawigan Office" 
                  required={isReq('departmentRequired')} 
                  disabled={submitting} 
                />

                <Field 
                  label={`Position${!isReq('positionRequired') ? ' (optional)' : ''}`} 
                  value={form.position} 
                  onChange={v => setForm(f => ({ ...f, position: v }))} 
                  error={errors.position} 
                  placeholder="Legislative Staff" 
                  required={isReq('positionRequired')} 
                  disabled={submitting} 
                />

                <Field 
                  label={`Phone Number${!isReq('phoneRequired') ? ' (optional)' : ''}`} 
                  value={form.phone} 
                  onChange={v => setForm(f => ({ ...f, phone: v }))} 
                  error={errors.phone} 
                  placeholder="+63 912 345 6789" 
                  required={isReq('phoneRequired')} 
                  disabled={submitting} 
                />

                <Field 
                  label={`Email Address${!isReq('emailRequired') ? ' (optional)' : ''}`} 
                  type="email" 
                  value={form.email} 
                  onChange={v => setForm(f => ({ ...f, email: v }))} 
                  error={errors.email} 
                  placeholder="juan@company.com" 
                  required={isReq('emailRequired')} 
                  disabled={submitting} 
                />

                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Attendance Confirmation <span className="text-orange-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.willAttend === 'yes'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="willAttend"
                        value="yes"
                        checked={form.willAttend === 'yes'}
                        onChange={() => setForm(f => ({ ...f, willAttend: 'yes', reason: '' }))}
                        disabled={submitting}
                        className="hidden"
                      />
                      <CheckCircle size={16} />
                      <span className="text-sm">Will Attend</span>
                    </label>

                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.willAttend === 'no'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="willAttend"
                        value="no"
                        checked={form.willAttend === 'no'}
                        onChange={() => setForm(f => ({ ...f, willAttend: 'no' }))}
                        disabled={submitting}
                        className="hidden"
                      />
                      <XCircle size={16} />
                      <span className="text-sm">Will Not Attend</span>
                    </label>
                  </div>
                </div>

                {form.willAttend === 'no' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Reason for non-attendance <span className="text-orange-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={form.reason}
                      onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Please specify why you cannot attend (e.g., Conflict of schedule, Official business, On leave)..."
                      disabled={submitting}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.reason
                          ? 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 bg-orange-50 dark:bg-orange-950/30'
                          : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800'
                      } dark:text-white dark:placeholder-slate-500`}
                    />
                    {errors.reason && <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">{errors.reason}</p>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30 text-base mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving response…
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Response
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-[11px] text-gray-400 dark:text-slate-500">
              Your response will be recorded for event management.
            </p>
          </div>
        ) : createdAttendee ? (
          /* ─── Success Views ─── */
          <div className="space-y-5 animate-fade-in">
            {isAttending ? (
              /* ── 1) WILL ATTEND: Success Banner + QR Code ── */
              <>
                <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-2xl p-5 text-center">
                  <CheckCircle size={40} className="text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Registration Successful!</h2>
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    {synced ? 'Your data has been saved to the database.' : 'Your data has been saved locally.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center">
                  <div className={`w-16 h-16 rounded-full ${getInitialsBg(createdAttendee.name)} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3`}>
                    {getInitials(createdAttendee.name)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{createdAttendee.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{createdAttendee.department} · {createdAttendee.position}</p>

                  <div className="mt-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                      Status: Will Attend
                    </span>
                  </div>

                  <div ref={qrRef} className="inline-block bg-white p-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-600 mt-5">
                    <QRCodeSVG
                      value={JSON.stringify({
                        id: createdAttendee.id,
                        name: createdAttendee.name,
                        email: createdAttendee.email,
                        department: createdAttendee.department,
                        willAttend: true,
                      })}
                      size={200}
                      level="H"
                      includeMargin={true}
                      fgColor="#1e40af"
                      bgColor="#ffffff"
                    />
                  </div>

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
                    Screenshot or download this QR code for attendance records
                  </p>

                  <div className="mt-5">
                    <button
                      onClick={handleDownloadQR}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                    >
                      <Download size={18} />
                      Download QR Code
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* ── 2) WILL NOT ATTEND: Thank You View (NO QR CODE) ── */
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <HeartHandshake size={36} />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Thank You for Filling Up the Form!</h2>
                  <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">
                    Your response has been logged successfully into our system.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl text-left border border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
                  <p><span className="font-semibold text-gray-700 dark:text-slate-200">Name:</span> {createdAttendee.name}</p>
                  <p><span className="font-semibold text-gray-700 dark:text-slate-200">Department:</span> {createdAttendee.department}</p>
                  <p><span className="font-semibold text-gray-700 dark:text-slate-200">Status:</span> <span className="text-red-600 dark:text-red-400 font-semibold">Will Not Attend</span></p>
                  {createdAttendee.reason && (
                    <p><span className="font-semibold text-gray-700 dark:text-slate-200">Reason:</span> <span className="italic">"{createdAttendee.reason}"</span></p>
                  )}
                </div>
              </div>
            )}
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
        } dark:text-white dark:placeholder-slate-500 text-xs sm:text-sm`}
      />
      {error && <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">{error}</p>}
    </div>
  );
}