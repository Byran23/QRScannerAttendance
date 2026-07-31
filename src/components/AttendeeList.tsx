import { useState } from 'react';
import { Search, Plus, QrCode, Edit, Trash2, Users, Filter, Link, Check, CheckCircle2, XCircle, ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, LogIn, Users2, LayoutGrid, X, Eye, EyeOff, RotateCcw, UserCheck, Settings } from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AttendeeListProps {
  onNavigate: (page: Page, data?: any) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'office-asc' | 'date-desc' | 'date-asc';
type AttendanceFilterOption = 'all' | 'attending' | 'not-attending' | 'present';

export default function AttendeeList({ onNavigate }: AttendeeListProps) {
  const { attendees, updateAttendee, deleteAttendee, getAttendeeLastAction, checkInAttendee, eventConfig, updateEventConfig } = useData();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterTable, setFilterTable] = useState('all');
  const [filterAttendance, setFilterAttendance] = useState<AttendanceFilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedAttendeeId, setExpandedAttendeeId] = useState<string | null>(null);
  const [activeReasonTooltip, setActiveReasonTooltip] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Registration Link Banner starts HIDDEN by default
  const [showRegistrationBanner, setShowRegistrationBanner] = useState(false);

  // Field Requirements Config Modal State
  // Inside the Configure Fields Modal in AttendeeList.tsx
  const [fieldSettings, setFieldSettings] = useState({
    departmentRequired: eventConfig?.formFields?.departmentRequired ?? true,
    positionRequired: eventConfig?.formFields?.positionRequired ?? true,
    phoneRequired: eventConfig?.formFields?.phoneRequired ?? true,
    emailRequired: eventConfig?.formFields?.emailRequired ?? false,
    enableSuggestions: eventConfig?.formFields?.enableSuggestions ?? true, // Default ON
  });

  // Inside Modal JSX:
  <div className="space-y-2.5 pt-1">
    {/* Existing requirement checkboxes... */}

    {/* Toggle Autocomplete Suggestions */}
    <label className="flex items-center justify-between p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl cursor-pointer hover:bg-blue-100/50 transition-colors mt-2">
      <div>
        <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 block">
          Enable Data Autocomplete
        </span>
        <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
          Show name & field suggestions from Data Attendees tab
        </span>
      </div>
      <input
        type="checkbox"
        checked={fieldSettings.enableSuggestions}
        onChange={e => setFieldSettings({ ...fieldSettings, enableSuggestions: e.target.checked })}
        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
      />
    </label>
  </div>
  const [isSavingFields, setIsSavingFields] = useState(false);

  // Quick RSVP Editing Modal State
  const [editingRsvpAttendee, setEditingRsvpAttendee] = useState<Attendee | null>(null);
  const [rsvpWillAttend, setRsvpWillAttend] = useState<boolean>(true);
  const [rsvpReason, setRsvpReason] = useState<string>('');

  const registrationLink = `${window.location.origin}${window.location.pathname}#register`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = registrationLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSaveFieldSettings = async () => {
    setIsSavingFields(true);
    await updateEventConfig({
      title: eventConfig?.title || '',
      imageUrl: eventConfig?.imageUrl || '',
      formFields: fieldSettings,
    });
    setIsSavingFields(false);
    setIsConfiguringFields(false);
  };

  // Normalized Attendance Check
  const checkWillAttend = (a: Attendee): boolean => {
    if (a.willAttend === false) return false;
    if (a.willAttend === true) return true;

    const val = String(a.willAttend || '').toLowerCase().trim();
    if (
      val === 'will not attend' ||
      val === 'not attending' ||
      val === 'no' ||
      val === 'false' ||
      val === '0'
    ) {
      return false;
    }
    return true;
  };

  // Live Check-in Status helper
  const getStatus = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    if (!lastAction) return 'absent';
    return lastAction.type === 'check-in' ? 'present' : 'checked-out';
  };

  // Open Quick Edit Modal
  const openRsvpModal = (attendee: Attendee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRsvpAttendee(attendee);
    const isAttending = checkWillAttend(attendee);
    setRsvpWillAttend(isAttending);
    setRsvpReason(attendee.reason || '');
  };

  // Save RSVP Updates
  const handleSaveRsvp = async () => {
    if (!editingRsvpAttendee) return;
    await updateAttendee({
      ...editingRsvpAttendee,
      willAttend: rsvpWillAttend,
      reason: rsvpWillAttend ? '' : rsvpReason,
    });
    setEditingRsvpAttendee(null);
  };

  // Dynamic filter lists
  const departments = [...new Set(attendees.map(a => a.department).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const groups = [...new Set(attendees.map(a => a.group).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const tables = [...new Set(attendees.map(a => a.tableNo).filter(Boolean))]
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

  // Filtering
  const filtered = attendees.filter(a => {
    const isAttending = checkWillAttend(a);
    const liveStatus = getStatus(a);

    const matchesSearch = 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.email.toLowerCase().includes(search.toLowerCase()) || 
      a.department.toLowerCase().includes(search.toLowerCase()) ||
      (a.group && a.group.toLowerCase().includes(search.toLowerCase())) ||
      (a.tableNo && a.tableNo.toLowerCase().includes(search.toLowerCase())) ||
      (a.reason && a.reason.toLowerCase().includes(search.toLowerCase()));
      
    const matchesDept = filterDept === 'all' || a.department === filterDept;
    const matchesGroup = filterGroup === 'all' || a.group === filterGroup;
    const matchesTable = filterTable === 'all' || a.tableNo === filterTable;

    const matchesAttendance = 
      filterAttendance === 'all' ||
      (filterAttendance === 'attending' && isAttending) ||
      (filterAttendance === 'not-attending' && !isAttending) ||
      (filterAttendance === 'present' && liveStatus === 'present');

    return matchesSearch && matchesDept && matchesGroup && matchesTable && matchesAttendance;
  });

  // Dynamic Progress Bar Calculations
  const getBarMetrics = () => {
    const totalRegistered = attendees.length;

    if (filterAttendance === 'not-attending') {
      const notAttendingCount = filtered.length;
      const pct = totalRegistered > 0 ? Math.round((notAttendingCount / totalRegistered) * 100) : 0;
      return {
        pct,
        text: `${pct}% Not Attending (${notAttendingCount}/${totalRegistered} Registered)`,
        barGradient: 'from-red-500 via-rose-500 to-pink-500'
      };
    }

    const totalFiltered = filtered.length;
    const presentInFiltered = filtered.filter(a => getStatus(a) === 'present').length;
    const pct = totalFiltered > 0 ? Math.round((presentInFiltered / totalFiltered) * 100) : 0;
    return {
      pct,
      text: `${pct}% Present (${presentInFiltered}/${totalFiltered})`,
      barGradient: 'from-blue-500 via-emerald-500 to-green-500'
    };
  };

  const barMetrics = getBarMetrics();

  // Active Filter Description Label
  const getFilterDescriptionLabel = () => {
    const parts = [];
    if (filterAttendance === 'attending') parts.push('Attending');
    else if (filterAttendance === 'not-attending') parts.push('Not Attending');
    else if (filterAttendance === 'present') parts.push('Marked Present');

    if (filterDept !== 'all') parts.push(`Dept: ${filterDept}`);
    if (filterGroup !== 'all') parts.push(`Group: ${filterGroup}`);
    if (filterTable !== 'all') parts.push(`Table: ${filterTable}`);
    if (search.trim()) parts.push(`Search: "${search.trim()}"`);

    return parts.length > 0 ? parts.join(' · ') : 'All Registered Attendees';
  };

  const isAnyFilterActive = filterAttendance !== 'all' || filterDept !== 'all' || filterGroup !== 'all' || filterTable !== 'all' || search !== '';

  const resetAllFilters = () => {
    setFilterAttendance('all');
    setFilterDept('all');
    setFilterGroup('all');
    setFilterTable('all');
    setSearch('');
  };

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'office-asc':
        return a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
      case 'date-asc':
        return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime());
      case 'date-desc':
      default:
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
    }
  });

  const handleDelete = (id: string) => { deleteAttendee(id); setShowDeleteConfirm(null); };

  const handleCheckIn = (attendee: Attendee) => {
    if (checkInAttendee) {
      checkInAttendee(attendee.id);
    }
  };

  const totalAttending = attendees.filter(a => checkWillAttend(a)).length;
  const totalNotAttending = attendees.filter(a => !checkWillAttend(a)).length;
  const totalPresentCount = attendees.filter(a => getStatus(a) === 'present').length;

  const toggleExpand = (id: string) => {
    setExpandedAttendeeId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendees</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            {attendees.length} registered · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{totalPresentCount} present</span> · <span className="text-green-600 dark:text-green-400 font-medium">{totalAttending} attending</span> · <span className="text-red-600 dark:text-red-400 font-medium">{totalNotAttending} declined</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Banner Visibility Button */}
          <button
            onClick={() => setShowRegistrationBanner(!showRegistrationBanner)}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
            title={showRegistrationBanner ? "Hide Registration Link Banner" : "Show Registration Link Banner"}
          >
            {showRegistrationBanner ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          <button onClick={() => onNavigate('add-attendee')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {/* Toggleable Registration Link Banner */}
      {showRegistrationBanner && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 transition-all animate-fade-in space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Registration Form</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 truncate">Configure requirements or copy the link for self-registration</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Form Field Settings Gear Button */}
              <button
                onClick={() => setIsConfiguringFields(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-blue-200 dark:border-blue-800 shadow-sm"
                title="Set Required Fields"
              >
                <Settings size={14} className="text-blue-600 dark:text-blue-400" />
                Configure Fields
              </button>

              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {linkCopied ? <Check size={14} /> : <Link size={14} />}
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Field Requirements Configuration Modal ─── */}
      {isConfiguringFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4 animate-bounce-in border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                <Settings size={16} className="text-blue-600 dark:text-blue-400" />
                Form Field Requirements
              </h3>
              <button onClick={() => setIsConfiguringFields(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">
              Select which fields attendees are strictly required to fill up in the public form:
            </p>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-not-allowed opacity-80">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">Full Name</span>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Required (Fixed)</span>
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">Department / Office</span>
                <input
                  type="checkbox"
                  checked={fieldSettings.departmentRequired}
                  onChange={e => setFieldSettings({ ...fieldSettings, departmentRequired: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">Position / Job Title</span>
                <input
                  type="checkbox"
                  checked={fieldSettings.positionRequired}
                  onChange={e => setFieldSettings({ ...fieldSettings, positionRequired: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">Phone Number</span>
                <input
                  type="checkbox"
                  checked={fieldSettings.phoneRequired}
                  onChange={e => setFieldSettings({ ...fieldSettings, phoneRequired: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">Email Address</span>
                <input
                  type="checkbox"
                  checked={fieldSettings.emailRequired}
                  onChange={e => setFieldSettings({ ...fieldSettings, emailRequired: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setIsConfiguringFields(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFieldSettings}
                disabled={isSavingFields}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {isSavingFields ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Filter Status & Turnout Progress Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm transition-all space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">
              {getFilterDescriptionLabel()}
            </span>
            {isAnyFilterActive && (
              <button 
                onClick={resetAllFilters}
                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-medium"
              >
                <RotateCcw size={11} /> Reset Filter
              </button>
            )}
          </div>
          <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-2">
            {barMetrics.text}
          </span>
        </div>

        {/* Dynamic Animated Status Bar */}
        <div className="relative w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${barMetrics.barGradient} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${barMetrics.pct}%` }}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        {/* Attendance Status Tabs (All, Attending, Not Attending, Present) */}
        <div className="flex bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setFilterAttendance('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              filterAttendance === 'all'
                ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            All ({attendees.length})
          </button>
          
          <button
            onClick={() => setFilterAttendance('present')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center justify-center gap-1 ${
              filterAttendance === 'present'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck size={13} /> Present ({totalPresentCount})
          </button>

          <button
            onClick={() => setFilterAttendance('attending')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              filterAttendance === 'attending'
                ? 'bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            Attending ({totalAttending})
          </button>

          <button
            onClick={() => setFilterAttendance('not-attending')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              filterAttendance === 'not-attending'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            Not Attending ({totalNotAttending})
          </button>
        </div>

        {/* Filter & Search Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative sm:col-span-12 md:col-span-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search name, dept, group, table..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm" 
            />
          </div>

          {/* Department Filter (Alphabetical A-Z) */}
          <div className="relative sm:col-span-4 md:col-span-2">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)} 
              className="w-full pl-9 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Depts</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Group Filter (Alphabetical A-Z) */}
          <div className="relative sm:col-span-4 md:col-span-2">
            <Users2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={filterGroup} 
              onChange={e => setFilterGroup(e.target.value)} 
              className="w-full pl-9 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Groups</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Table No. Filter (Lowest to Highest) */}
          <div className="relative sm:col-span-4 md:col-span-2">
            <LayoutGrid size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={filterTable} 
              onChange={e => setFilterTable(e.target.value)} 
              className="w-full pl-9 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Tables</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative sm:col-span-12 md:col-span-2">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as SortOption)} 
              className="w-full pl-9 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">A–Z</option>
              <option value="name-desc">Z–A</option>
              <option value="office-asc">By Department</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick RSVP Edit Modal */}
      {editingRsvpAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4 animate-bounce-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">Update Attendance Intention</h3>
              <button onClick={() => setEditingRsvpAttendee(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="font-semibold text-gray-800 dark:text-white text-base">{editingRsvpAttendee.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{editingRsvpAttendee.department} · {editingRsvpAttendee.position}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRsvpWillAttend(true)}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                  rsvpWillAttend
                    ? 'bg-green-600 text-white border-green-600 shadow-md'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 size={16} /> Will Attend
              </button>
              <button
                type="button"
                onClick={() => setRsvpWillAttend(false)}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                  !rsvpWillAttend
                    ? 'bg-red-600 text-white border-red-600 shadow-md'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                }`}
              >
                <XCircle size={16} /> Will Not Attend
              </button>
            </div>

            {!rsvpWillAttend && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Reason for Non-Attendance
                </label>
                <textarea
                  value={rsvpReason}
                  onChange={e => setRsvpReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-xs dark:text-white"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setEditingRsvpAttendee(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRsvp}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Users size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No attendees found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(attendee => {
            const status = getStatus(attendee);
            const isAttending = checkWillAttend(attendee);
            const isExpanded = expandedAttendeeId === attendee.id;
            const isTooltipOpen = activeReasonTooltip === attendee.id;
            const isCheckedIn = status === 'present';

            return (
              <div 
                key={attendee.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border transition-all ${
                  !isAttending 
                    ? 'border-red-200 dark:border-red-950/60 hover:border-red-300' 
                    : 'border-gray-100 dark:border-slate-800 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full ${getInitialsBg(attendee.name)} flex items-center justify-center text-white text-lg font-bold shrink-0 mt-0.5`}>
                    {getInitials(attendee.name)}
                  </div>

                  {/* Left / Main Details */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(attendee.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{attendee.name}</h3>

                      {/* Interactive Attendance Intention Badge */}
                      <div className="relative inline-block">
                        <span 
                          onClick={(e) => openRsvpModal(attendee, e)}
                          onMouseEnter={() => {
                            if (!isAttending) setActiveReasonTooltip(attendee.id);
                          }}
                          onMouseLeave={() => {
                            if (!isAttending) setActiveReasonTooltip(null);
                          }}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95 group/badge ${
                            isAttending 
                              ? 'bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200' 
                              : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-200'
                          }`}
                          title="Click to change attendance status"
                        >
                          {isAttending ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                          {isAttending ? 'Will Attend' : 'Will Not Attend'}
                          <Edit size={10} className="ml-0.5 opacity-60 group-hover/badge:opacity-100 shrink-0" />
                          {!isAttending && <AlertCircle size={12} className="ml-0.5 text-red-500 animate-pulse shrink-0" />}
                        </span>

                        {/* Tooltip Reason */}
                        {!isAttending && isTooltipOpen && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-xl shadow-xl border border-slate-700 z-50 animate-fade-in">
                            <div className="flex items-center gap-1.5 text-red-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                              <AlertCircle size={13} /> Reason For Non-Attendance
                            </div>
                            <p className="italic text-slate-200 font-normal">
                              {attendee.reason ? `"${attendee.reason}"` : 'No specific reason provided.'}
                            </p>
                            <div className="absolute left-4 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900 dark:border-t-slate-800"></div>
                          </div>
                        )}
                      </div>

                      {/* Live Status */}
                      {isAttending && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          status === 'present' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : status === 'checked-out' 
                            ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800' 
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                        }`}>
                          {status === 'present' ? 'Present' : status === 'checked-out' ? 'Left' : 'Absent'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">
                      {attendee.department} · {attendee.position}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{attendee.email || 'No email'} · {attendee.phone || 'No phone'}</p>
                  </div>

                  {/* Actions & Meta Badges (Far Right Column) */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Top Row: Buttons */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleExpand(attendee.id)} 
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 transition-colors" 
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      
                      {/* QR Code Button STRICTLY Hidden for Non-Attendees */}
                      {isAttending && (
                        <button 
                          onClick={() => onNavigate('qr-view', attendee)} 
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg text-blue-600 dark:text-blue-400 transition-colors" 
                          title="View QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                      )}

                      <button onClick={() => onNavigate('edit-attendee', attendee)} className="p-2 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg text-sky-600 dark:text-sky-400 transition-colors" title="Edit Profile"><Edit size={18} /></button>
                      <button onClick={() => setShowDeleteConfirm(attendee.id)} className="p-2 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-lg text-orange-500 dark:text-orange-400 transition-colors" title="Delete"><Trash2 size={18} /></button>
                    </div>

                    {/* Bottom Row: Group & Table No. side-by-side on 1 line */}
                    {(attendee.group || attendee.tableNo) && (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {attendee.group && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-900">
                            <Users2 size={11} className="shrink-0 text-blue-600 dark:text-blue-400" />
                            {attendee.group}
                          </span>
                        )}

                        {attendee.tableNo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-700/80 shadow-sm">
                            <LayoutGrid size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            {attendee.tableNo.toLowerCase().includes('table') ? attendee.tableNo : `Table ${attendee.tableNo}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">Group Name: </span>
                        {attendee.group || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">Assigned Table: </span>
                        {attendee.tableNo || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">Registration Date: </span>
                        {attendee.createdAt ? new Date(attendee.createdAt).toLocaleString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">ID Reference: </span>
                        <span className="font-mono text-[11px]">{attendee.id}</span>
                      </div>
                    </div>

                    {/* Check In Button rendered inside expanded section strictly for attending users */}
                    {isAttending && (
                      <button
                        onClick={() => handleCheckIn(attendee)}
                        disabled={isCheckedIn}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                          isCheckedIn
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 cursor-default opacity-80'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95'
                        }`}
                        title={isCheckedIn ? 'Already Checked In' : 'Check In Attendee'}
                      >
                        {isCheckedIn ? <Check size={14} /> : <LogIn size={14} />}
                        <span>{isCheckedIn ? 'Checked In' : 'Check In'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm === attendee.id && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/50 rounded-xl flex items-center justify-between">
                    <p className="text-sm text-orange-700 dark:text-orange-400">Delete this attendee?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(null)} className="px-3 py-1 text-sm bg-white dark:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-300">Cancel</button>
                      <button onClick={() => handleDelete(attendee.id)} className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}