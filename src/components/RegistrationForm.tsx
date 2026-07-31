import { useState, useRef, useMemo, useEffect } from 'react';
import { ScanLine, CheckCircle, Download, Send, AlertTriangle, Loader2, CloudOff, XCircle, HeartHandshake, User, Building2, Briefcase, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../DataContext';
import { getInitials, getInitialsBg } from '../utils/initials';
import { Attendee } from '../types';
import { isGoogleSheetsConfigured } from '../googleSheets';

const LS_DEVICE_REGISTERED_KEY = 'attendease_device_submission';

// Helper function to convert Google Drive share links to mobile-friendly direct image URLs
export function getDirectImageUrl(url: string): string {
  if (!url) return '';
  
  // Extract File ID from standard Google Drive URLs
  const driveRegex = /\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);

  if (match && match[1]) {
    const fileId = match[1];
    // Uses Google's direct image CDN endpoint (Bypasses CORS & MIME type blocks on mobile Safari/Chrome)
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  }

  return url;
}

export default function RegistrationForm() {
  const { addAttendee, synced, eventConfig, dataAttendees, attendees } = useData();
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
  
  // Device Lock State
  const [alreadyRegisteredOnDevice, setAlreadyRegisteredOnDevice] = useState<Attendee | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);
  const sheetConfigured = isGoogleSheetsConfigured();

  // Admin Config Toggles
  const suggestionsEnabled = eventConfig?.formFields?.enableSuggestions !== false;
  const preventDuplicateDevice = eventConfig?.formFields?.preventDuplicateDevice === true;

  // Check if device is locked ONLY IF preventDuplicateDevice toggle is enabled
  useEffect(() => {
    if (preventDuplicateDevice) {
      try {
        const savedSubmission = localStorage.getItem(LS_DEVICE_REGISTERED_KEY);
        if (savedSubmission) {
          setAlreadyRegisteredOnDevice(JSON.parse(savedSubmission));
        }
      } catch (e) {
        console.error('Failed to parse device submission lock:', e);
      }
    } else {
      setAlreadyRegisteredOnDevice(null);
    }
  }, [preventDuplicateDevice]);

  const masterList = suggestionsEnabled ? (dataAttendees || []) : [];

  const nameOptions = useMemo(() => {
    if (!suggestionsEnabled) return [];
    return [...new Set(masterList.map(a => a.name?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [masterList, suggestionsEnabled]);

  const departmentOptions = useMemo(() => {
    if (!suggestionsEnabled) return [];
    return [...new Set(masterList.map(a => a.department?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [masterList, suggestionsEnabled]);

  const positionOptions = useMemo(() => {
    if (!suggestionsEnabled) return [];
    return [...new Set(masterList.map(a => a.position?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [masterList, suggestionsEnabled]);

  const handleSelectName = (selectedName: string) => {
    if (suggestionsEnabled) {
      const matched = masterList.find(a => a.name?.toLowerCase().trim() === selectedName.toLowerCase().trim());
      if (matched) {
        setForm(prev => ({
          ...prev,
          name: selectedName,
          email: matched.email || prev.email,
          department: matched.department || prev.department,
          position: matched.position || prev.position,
          phone: matched.phone || prev.phone,
        }));
        return;
      }
    }
    setForm(prev => ({ ...prev, name: selectedName }));
  };

  const isReq = (field: 'departmentRequired' | 'positionRequired' | 'phoneRequired' | 'emailRequired') => {
    if (eventConfig?.formFields && eventConfig.formFields[field] !== undefined) {
      return !!eventConfig.formFields[field];
    }
    if (field === 'emailRequired') return false;
    return true;
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

    // Phone duplicate validation if lock is enabled
    if (preventDuplicateDevice) {
      const normalizedPhone = form.phone.replace(/\D/g, '');
      const phoneExists = attendees.some(a => a.phone && a.phone.replace(/\D/g, '') === normalizedPhone && normalizedPhone.length > 5);
      if (phoneExists) {
        errs.phone = 'This phone number has already submitted an entry.';
      }
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

      // Save device lockout if toggle enabled
      if (preventDuplicateDevice) {
        localStorage.setItem(LS_DEVICE_REGISTERED_KEY, JSON.stringify(attendee));
      }

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
    const currentAttendee = createdAttendee || alreadyRegisteredOnDevice;
    if (!currentAttendee || !qrRef.current) return;
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
        link.download = `QR-${currentAttendee.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const activeDisplayAttendee = createdAttendee || alreadyRegisteredOnDevice;
  const isAttending = activeDisplayAttendee?.willAttend !== false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors font-sans">
      
      {/* ─── Header Banner (Mobile Fix) ─── */}
      <header className="relative w-full min-h-[160px] sm:min-h-[180px] bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
        {eventConfig?.imageUrl ? (
          <>
            <img
              src={getDirectImageUrl(eventConfig.imageUrl)}
              alt="Event Header Logo"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-85 z-0"
              crossOrigin="anonymous"
              onError={(e) => { 
                console.warn("Failed to load header image URL:", eventConfig?.imageUrl);
                (e.target as HTMLElement).style.display = 'none'; 
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 z-0 pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-orange-500 z-0" />
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
        
        {/* ─── DEVICE LOCK SCREEN (Active strictly when preventDuplicateDevice is ON) ─── */}
        {preventDuplicateDevice && alreadyRegisteredOnDevice && !submitted ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <Lock size={30} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Device Submission Lock</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                This device has already submitted a response for this event.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl text-left border border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
              <p><span className="font-semibold text-gray-700 dark:text-slate-200">Registered Name:</span> {alreadyRegisteredOnDevice.name}</p>
              <p><span className="font-semibold text-gray-700 dark:text-slate-200">Department:</span> {alreadyRegisteredOnDevice.department}</p>
              <p><span className="font-semibold text-gray-700 dark:text-slate-200">Status:</span> {alreadyRegisteredOnDevice.willAttend ? <span className="text-green-600 font-semibold">Attending</span> : <span className="text-red-600 font-semibold">Not Attending</span>}</p>
            </div>

            {alreadyRegisteredOnDevice.willAttend && (
              <div className="pt-2">
                <div ref={qrRef} className="inline-block bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-3">
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: alreadyRegisteredOnDevice.id,
                      name: alreadyRegisteredOnDevice.name,
                      email: alreadyRegisteredOnDevice.email,
                      department: alreadyRegisteredOnDevice.department,
                      willAttend: true,
                    })}
                    size={180}
                    level="H"
                    includeMargin={true}
                    fgColor="#1e40af"
                    bgColor="#ffffff"
                  />
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Download size={15} />
                  Download Saved QR Code
                </button>
              </div>
            )}
          </div>
        ) : !submitted ? (
          /* ─── Standard Registration Form ─── */
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Register Attendance</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                {suggestionsEnabled ? 'Select or type your name to auto-fill details' : 'Fill in your details to confirm attendance'}
              </p>
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
                <div className={`w-12 h-12 rounded-full ${getInitialsBg(form.name)} flex items-center justify-center text-white text-lg font-bold transition-colors shrink-0 mt-0.5`}>
                  {form.name.trim() ? getInitials(form.name) : '?'}
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
                <AutocompleteField 
                  label="Full Name" 
                  value={form.name} 
                  onChange={v => setForm(f => ({ ...f, name: v }))}
                  onSelect={handleSelectName}
                  options={nameOptions}
                  enabled={suggestionsEnabled}
                  error={errors.name} 
                  placeholder="Juan Dela Cruz" 
                  required 
                  disabled={submitting}
                  icon={<User size={14} className="text-blue-500" />}
                />

                <AutocompleteField 
                  label={`Department/Office${!isReq('departmentRequired') ? ' (optional)' : ''}`} 
                  value={form.department} 
                  onChange={v => setForm(f => ({ ...f, department: v }))} 
                  onSelect={v => setForm(f => ({ ...f, department: v }))}
                  options={departmentOptions}
                  enabled={suggestionsEnabled}
                  error={errors.department} 
                  placeholder="Sangguniang Panlalawigan Office" 
                  required={isReq('departmentRequired')} 
                  disabled={submitting}
                  icon={<Building2 size={14} className="text-blue-500" />}
                />

                <AutocompleteField 
                  label={`Position${!isReq('positionRequired') ? ' (optional)' : ''}`} 
                  value={form.position} 
                  onChange={v => setForm(f => ({ ...f, position: v }))} 
                  onSelect={v => setForm(f => ({ ...f, position: v }))}
                  options={positionOptions}
                  enabled={suggestionsEnabled}
                  error={errors.position} 
                  placeholder="Legislative Staff" 
                  required={isReq('positionRequired')} 
                  disabled={submitting}
                  icon={<Briefcase size={14} className="text-blue-500" />}
                />

                <StandardField 
                  label={`Phone Number${!isReq('phoneRequired') ? ' (optional)' : ''}`} 
                  value={form.phone} 
                  onChange={v => setForm(f => ({ ...f, phone: v }))} 
                  error={errors.phone} 
                  placeholder="+63 912 345 6789" 
                  required={isReq('phoneRequired')} 
                  disabled={submitting} 
                />

                <StandardField 
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
              {preventDuplicateDevice ? 'Device submission limit is currently ENABLED by admin.' : 'Your response will be recorded for event management.'}
            </p>
          </div>
        ) : createdAttendee ? (
          /* ─── Success Views ─── */
          <div className="space-y-5 animate-fade-in">
            {isAttending ? (
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

function AutocompleteField({ 
  label, value, onChange, onSelect, options, enabled, error, placeholder, required, disabled, icon 
}: {
  label: string; value: string; onChange: (v: string) => void; onSelect: (v: string) => void; options: string[]; enabled: boolean; error?: string; placeholder?: string; required?: boolean; disabled?: boolean; icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!enabled || !options.length) return [];
    if (!value.trim()) return options.slice(0, 8);
    return options.filter(opt => opt.toLowerCase().includes(value.toLowerCase().trim())).slice(0, 8);
  }, [options, value, enabled]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      
      <input
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          if (enabled) setIsOpen(true);
        }}
        onFocus={() => {
          if (enabled) setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          error
            ? 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 bg-orange-50 dark:bg-orange-950/30'
            : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800'
        } dark:text-white dark:placeholder-slate-500 text-xs sm:text-sm`}
      />

      {isOpen && enabled && filtered.length > 0 && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 animate-fade-in">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs sm:text-sm text-gray-800 dark:text-slate-200 flex items-center gap-2 transition-colors"
            >
              {icon}
              <span className="truncate font-medium">{item}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function StandardField({ label, value, onChange, error, placeholder, type = 'text', required, disabled }: {
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