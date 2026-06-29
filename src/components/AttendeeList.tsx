import { useState } from 'react';
import { Search, Plus, QrCode, Edit, Trash2, Users, Filter, Share2, Link, Check } from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AttendeeListProps {
  onNavigate: (page: Page, data?: any) => void;
}

export default function AttendeeList({ onNavigate }: AttendeeListProps) {
  const { attendees, deleteAttendee, getAttendeeLastAction } = useData();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
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

  const filtered = attendees.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()) || a.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'all' || a.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleDelete = (id: string) => { deleteAttendee(id); setShowDeleteConfirm(null); };

  const getStatus = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    if (!lastAction) return 'absent';
    return lastAction.type === 'check-in' ? 'present' : 'checked-out';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendees</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">{attendees.length} registered</p>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input type="text" placeholder="Search by name, email, or dept/office..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 transition-colors" />
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="pl-10 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white appearance-none cursor-pointer transition-colors">
            <option value="all">All Dept/Office</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 transition-colors">
          <Users size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No attendees found</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{search ? 'Try adjusting your search' : 'Add your first attendee to get started'}</p>
          {!search && <button onClick={() => onNavigate('add-attendee')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all"><Plus size={16} className="inline mr-1" />Add Attendee</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(attendee => {
            const status = getStatus(attendee);
            return (
              <div key={attendee.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${getInitialsBg(attendee.name)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>{getInitials(attendee.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{attendee.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'present' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : status === 'checked-out' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                        {status === 'present' ? 'Present' : status === 'checked-out' ? 'Left' : 'Absent'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">{attendee.department} · {attendee.position}</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 truncate mt-1">{attendee.email} · {attendee.phone || 'No phone'}</p>
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
