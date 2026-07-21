import { useState } from 'react';
import { Search, Plus, QrCode, Edit, Trash2, Users, Filter, Share2, Link, Check, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AttendeeListProps {
  onNavigate: (page: Page, data?: any) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'office-asc' | 'date-desc' | 'date-asc';

export default function AttendeeList({ onNavigate }: AttendeeListProps) {
  const { attendees, deleteAttendee, getAttendeeLastAction } = useData();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterAttendance, setFilterAttendance] = useState<'all' | 'attending' | 'not-attending'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const registrationLink = `${window.location.origin}${window.location.pathname}#register`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
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

  const departments = [...new Set(attendees.map(a => a.department))];

  // Filtering
  const filtered = attendees.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.email.toLowerCase().includes(search.toLowerCase()) || 
      a.department.toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = filterDept === 'all' || a.department === filterDept;

    const matchesAttendance = 
      filterAttendance === 'all' ||
      (filterAttendance === 'attending' && a.willAttend !== false) ||
      (filterAttendance === 'not-attending' && a.willAttend === false);

    return matchesSearch && matchesDept && matchesAttendance;
  });

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

  const getStatus = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    if (!lastAction) return 'absent';
    return lastAction.type === 'check-in' ? 'present' : 'checked-out';
  };

  const totalAttending = attendees.filter(a => a.willAttend !== false).length;
  const totalNotAttending = attendees.filter(a => a.willAttend === false).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendees</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            {attendees.length} registered · {totalAttending} attending · {totalNotAttending} declined
          </p>
        </div>
        <button onClick={() => onNavigate('add-attendee')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          <Plus size={18} /> Add New
        </button>
      </div>

      {/* Share Registration Form */}
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
                linkCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
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

      {/* Filters & Sorting Bar */}
      <div className="space-y-3">
        {/* Attendance Status Tabs */}
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

        {/* Search, Dept Filter, and Sort Option */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Field */}
          <div className="relative sm:col-span-6">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, or dept/office..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 transition-colors text-sm" 
            />
          </div>

          {/* Office/Department Filter */}
          <div className="relative sm:col-span-3">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)} 
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Dept/Office</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative sm:col-span-3">
            <ArrowUpDown size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as SortOption)} 
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm appearance-none cursor-pointer transition-colors"
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
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 transition-colors">
          <Users size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No attendees found</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{search || filterDept !== 'all' || filterAttendance !== 'all' ? 'Try adjusting your filters or search' : 'Add your first attendee to get started'}</p>
          {!search && filterDept === 'all' && filterAttendance === 'all' && (
            <button onClick={() => onNavigate('add-attendee')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all"><Plus size={16} className="inline mr-1" />Add Attendee</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(attendee => {
            const status = getStatus(attendee);
            const isAttending = attendee.willAttend !== false;

            return (
              <div key={attendee.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full ${getInitialsBg(attendee.name)} flex items-center justify-center text-white text-lg font-bold shrink-0 mt-0.5`}>
                    {getInitials(attendee.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{attendee.name}</h3>
                      
                      {/* Attendance Intention Badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        isAttending 
                          ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' 
                          : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                      }`}>
                        {isAttending ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {isAttending ? 'Will Attend' : 'Will Not Attend'}
                      </span>

                      {/* Event Live Scan Status */}
                      {isAttending && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'present' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : status === 'checked-out' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                          {status === 'present' ? 'Present' : status === 'checked-out' ? 'Left' : 'Absent'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">{attendee.department} · {attendee.position}</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 truncate mt-0.5">{attendee.email} · {attendee.phone || 'No phone'}</p>

                    {/* Display Non-attendance Reason */}
                    {!isAttending && attendee.reason && (
                      <div className="mt-2 text-xs bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-lg p-2 text-red-700 dark:text-red-300">
                        <span className="font-semibold">Reason: </span>
                        <span className="italic">{attendee.reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onNavigate('qr-view', attendee)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg text-blue-600 dark:text-blue-400 transition-colors" title="View QR Code"><QrCode size={18} /></button>
                    <button onClick={() => onNavigate('edit-attendee', attendee)} className="p-2 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg text-sky-600 dark:text-sky-400 transition-colors" title="Edit"><Edit size={18} /></button>
                    <button onClick={() => setShowDeleteConfirm(attendee.id)} className="p-2 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-lg text-orange-500 dark:text-orange-400 transition-colors" title="Delete"><Trash2 size={18} /></button>
                  </div>
                </div>

                {showDeleteConfirm === attendee.id && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/50 rounded-xl flex items-center justify-between">
                    <p className="text-sm text-orange-700 dark:text-orange-400">Delete this attendee?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(null)} className="px-3 py-1 text-sm bg-white dark:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
                      <button onClick={() => handleDelete(attendee.id)} className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Delete</button>
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