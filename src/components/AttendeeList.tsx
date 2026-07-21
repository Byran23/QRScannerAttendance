import { useState } from 'react';
import { Search, Plus, QrCode, Edit, Trash2, Users, Filter, Share2, Link, Check, CheckCircle2, XCircle, ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, LogIn } from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AttendeeListProps {
  onNavigate: (page: Page, data?: any) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'office-asc' | 'date-desc' | 'date-asc';

export default function AttendeeList({ onNavigate }: AttendeeListProps) {
  const { attendees, deleteAttendee, getAttendeeLastAction, checkInAttendee } = useData();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterAttendance, setFilterAttendance] = useState<'all' | 'attending' | 'not-attending'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedAttendeeId, setExpandedAttendeeId] = useState<string | null>(null);
  const [activeReasonTooltip, setActiveReasonTooltip] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AttendEase Registration',
          text: 'Register as an attendee and get your QR code:',
          url: registrationLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Normalized Attendance Check (Strict check for Boolean or Google Sheets String)
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

  const departments = [...new Set(attendees.map(a => a.department))];

  const filtered = attendees.filter(a => {
    const isAttending = checkWillAttend(a);

    const matchesSearch = 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.email.toLowerCase().includes(search.toLowerCase()) || 
      a.department.toLowerCase().includes(search.toLowerCase()) ||
      (a.reason && a.reason.toLowerCase().includes(search.toLowerCase()));
      
    const matchesDept = filterDept === 'all' || a.department === filterDept;

    const matchesAttendance = 
      filterAttendance === 'all' ||
      (filterAttendance === 'attending' && isAttending) ||
      (filterAttendance === 'not-attending' && !isAttending);

    return matchesSearch && matchesDept && matchesAttendance;
  });

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

  const getStatus = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    if (!lastAction) return 'absent';
    return lastAction.type === 'check-in' ? 'present' : 'checked-out';
  };

  const handleCheckIn = (attendee: Attendee) => {
    if (checkInAttendee) {
      checkInAttendee(attendee.id);
    }
  };

  const totalAttending = attendees.filter(a => checkWillAttend(a)).length;
  const totalNotAttending = attendees.filter(a => !checkWillAttend(a)).length;

  const toggleExpand = (id: string) => {
    setExpandedAttendeeId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendees</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            {attendees.length} registered · <span className="text-green-600 dark:text-green-400 font-medium">{totalAttending} attending</span> · <span className="text-red-600 dark:text-red-400 font-medium">{totalNotAttending} declined</span>
          </p>
        </div>
        <button onClick={() => onNavigate('add-attendee')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          <Plus size={18} /> Add New
        </button>
      </div>

      {/* Share Link */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Registration Form</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 truncate">Share the link so attendees can self-register</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {linkCopied ? <Check size={14} /> : <Link size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-all border border-blue-200 dark:border-blue-800"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="flex bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setFilterAttendance('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterAttendance === 'all'
                ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            All ({attendees.length})
          </button>
          <button
            onClick={() => setFilterAttendance('attending')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterAttendance === 'attending'
                ? 'bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            Attending ({totalAttending})
          </button>
          <button
            onClick={() => setFilterAttendance('not-attending')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterAttendance === 'not-attending'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            Not Attending ({totalNotAttending})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-6">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, dept, or reason..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm" 
            />
          </div>

          <div className="relative sm:col-span-3">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)} 
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Dept/Office</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="relative sm:col-span-3">
            <ArrowUpDown size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as SortOption)} 
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm appearance-none cursor-pointer"
            >
              <option value="date-desc">Registered (Newest)</option>
              <option value="date-asc">Registered (Oldest)</option>
              <option value="name-asc">Alphabetical (A–Z)</option>
              <option value="name-desc">Alphabetical (Z–A)</option>
              <option value="office-asc">By Office/Department</option>
            </select>
          </div>
        </div>
      </div>

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

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(attendee.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{attendee.name}</h3>
                      
                      {/* Badge */}
                      <div className="relative inline-block">
                        <span 
                          onClick={(e) => {
                            if (!isAttending) {
                              e.stopPropagation();
                              setActiveReasonTooltip(prev => prev === attendee.id ? null : attendee.id);
                            }
                          }}
                          onMouseEnter={() => {
                            if (!isAttending) setActiveReasonTooltip(attendee.id);
                          }}
                          onMouseLeave={() => {
                            if (!isAttending) setActiveReasonTooltip(null);
                          }}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95 ${
                            isAttending 
                              ? 'bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                              : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {isAttending ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                          {isAttending ? 'Will Attend' : 'Will Not Attend'}
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

                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">{attendee.department} · {attendee.position}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{attendee.email || 'No email'} · {attendee.phone || 'No phone'}</p>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1 shrink-0">
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

                    <button onClick={() => onNavigate('edit-attendee', attendee)} className="p-2 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg text-sky-600 dark:text-sky-400 transition-colors" title="Edit"><Edit size={18} /></button>
                    <button onClick={() => setShowDeleteConfirm(attendee.id)} className="p-2 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-lg text-orange-500 dark:text-orange-400 transition-colors" title="Delete"><Trash2 size={18} /></button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">Registration Date: </span>
                        {attendee.createdAt ? new Date(attendee.createdAt).toLocaleString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-slate-300">ID Reference: </span>
                        <span className="font-mono text-[11px]">{attendee.id}</span>
                      </div>
                    </div>

                    {/* Check In Button rendered inside expanded section STRICTLY for attending users */}
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