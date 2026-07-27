import { useState } from 'react';
import { ArrowLeft, Save, User } from 'lucide-react';
import { Attendee, Page } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AddEditAttendeeProps {
  onNavigate: (page: Page) => void;
  editData?: Attendee | null;
}

export default function AddEditAttendee({ onNavigate, editData }: AddEditAttendeeProps) {
  const { addAttendee, updateAttendee } = useData();
  const isEdit = !!editData;
  const [form, setForm] = useState({
    name: editData?.name || '',
    email: editData?.email || '',
    department: editData?.department || '',
    position: editData?.position || '',
    phone: editData?.phone || '',
    group: editData?.group || '',
    tableNo: editData?.tableNo || '',
    willAttend: editData?.willAttend !== false,
    reason: editData?.reason || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.department.trim()) errs.department = 'Department/Office is required';
    if (!form.position.trim()) errs.position = 'Position is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isEdit && editData) {
      updateAttendee({ ...editData, ...form });
    } else {
      addAttendee(form);
    }
    setSaved(true);
    setTimeout(() => onNavigate('attendees'), 800);
  };

  const previewInitials = form.name.trim() ? getInitials(form.name) : '?';
  const previewBg = form.name.trim() ? getInitialsBg(form.name) : 'bg-gray-400';

  return (
    <div className="space-y-4">
      <button onClick={() => onNavigate('attendees')} className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back to Attendees
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{isEdit ? 'Edit Attendee' : 'Add New Attendee'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{isEdit ? 'Update attendee information' : 'Register a new attendee in the system'}</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium">
            ✅ Attendee {isEdit ? 'updated' : 'added'} successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
            <div className={`w-14 h-14 rounded-full ${previewBg} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
              {previewInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">{form.name.trim() || 'Enter a name'}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                {form.group ? `Group: ${form.group}` : 'No Group'} · {form.tableNo ? `Table: ${form.tableNo}` : 'No Table'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} placeholder="Juan Dela Cruz" />
            <InputField label="Email (optional)" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} error={errors.email} placeholder="juan@company.com" />
            <InputField label="Department/Office" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} error={errors.department} placeholder="Engineering" />
            <InputField label="Position" value={form.position} onChange={v => setForm(f => ({ ...f, position: v }))} error={errors.position} placeholder="Software Engineer" />
            <InputField label="Phone (optional)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+1 (555) 123-4567" />
            
            {/* Group & Table No. Fields */}
            <InputField label="Group (optional)" value={form.group} onChange={v => setForm(f => ({ ...f, group: v }))} placeholder="Group A / VIP" />
            <InputField label="Table No. (optional)" value={form.tableNo} onChange={v => setForm(f => ({ ...f, tableNo: v }))} placeholder="Table 5" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saved} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
              <Save size={18} /> {isEdit ? 'Update' : 'Add'} Attendee
            </button>
            <button type="button" onClick={() => onNavigate('attendees')} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, error, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
          error ? 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800'
        } dark:text-white dark:placeholder-slate-500`} 
      />
      {error && <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">{error}</p>}
    </div>
  );
}