import { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Image as ImageIcon, 
  Edit2, 
  Save, 
  X,
  UserCheck2,
  UserX2,
  RotateCcw
} from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';
import AttendeeSearch from './AttendeeSearch';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

type CardFilterType = 'all' | 'will-attend' | 'will-not-attend' | 'present' | 'absent';

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { attendees, todayRecords, addRecord, getAttendeeLastAction, eventConfig, updateEventConfig } = useData();

  const [pendingScan, setPendingScan] = useState<{ attendee: Attendee; actionType: 'check-in' | 'check-out' } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; detail?: string } | null>(null);
  
  // Card Filter Selection State
  const [selectedFilter, setSelectedFilter] = useState<CardFilterType>('all');

  // Event Config Edit Modal / Inline State
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventTitleInput, setEventTitleInput] = useState(eventConfig?.title || '');
  const [eventImageInput, setEventImageInput] = useState(eventConfig?.imageUrl || '');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Core Counts
  const totalAttendees = attendees.length;

  // RSVP Counts
  const willAttendList = attendees.filter(a => a.willAttend === true || a.willAttend === 'true' || a.willAttend === undefined || String(a.willAttend).toLowerCase().trim() === 'will attend');
  const willAttendCount = willAttendList.length;

  const willNotAttendList = attendees.filter(a => a.willAttend === false || a.willAttend === 'false' || String(a.willAttend).toLowerCase().trim() === 'will not attend');
  const willNotAttendCount = willNotAttendList.length;

  // Ratios & Percentages for Total Card
  const willAttendPct = totalAttendees > 0 ? Math.round((willAttendCount / totalAttendees) * 100) : 0;
  const willNotAttendPct = totalAttendees > 0 ? Math.round((willNotAttendCount / totalAttendees) * 100) : 0;

  // Present & Absent strictly based on WILL ATTEND count
  const checkedInToday = new Set(todayRecords.filter(r => r.type === 'check-in').map(r => r.attendeeId));
  
  // Count present attendees who are in the "Will Attend" list
  const presentCount = willAttendList.filter(a => checkedInToday.has(a.id)).length;
  // Absent is strictly from the Will Attend pool
  const absentCount = Math.max(0, willAttendCount - presentCount);

  // Dynamic Status Bar Calculations
  const getFilteredCountAndLabel = () => {
    switch (selectedFilter) {
      case 'will-attend':
        return {
          count: willAttendCount,
          totalBenchmark: totalAttendees,
          label: 'Will Attend Rate',
          pct: totalAttendees > 0 ? Math.round((willAttendCount / totalAttendees) * 100) : 0,
          colorClass: 'from-emerald-500 to-teal-500'
        };
      case 'will-not-attend':
        return {
          count: willNotAttendCount,
          totalBenchmark: totalAttendees,
          label: 'Will Not Attend Rate',
          pct: totalAttendees > 0 ? Math.round((willNotAttendCount / totalAttendees) * 100) : 0,
          colorClass: 'from-rose-500 to-red-500'
        };
      case 'present':
        return {
          count: presentCount,
          totalBenchmark: willAttendCount,
          label: 'Turnout Rate (Present vs. Will Attend)',
          pct: willAttendCount > 0 ? Math.round((presentCount / willAttendCount) * 100) : 0,
          colorClass: 'from-green-500 to-emerald-500'
        };
      case 'absent':
        return {
          count: absentCount,
          totalBenchmark: willAttendCount,
          label: 'Absence Rate (Absent vs. Will Attend)',
          pct: willAttendCount > 0 ? Math.round((absentCount / willAttendCount) * 100) : 0,
          colorClass: 'from-orange-500 to-amber-500'
        };
      case 'all':
      default:
        return {
          count: willAttendCount,
          totalBenchmark: totalAttendees,
          label: 'RSVP Ratio (Will Attend vs Registered)',
          pct: willAttendPct,
          colorClass: 'from-blue-500 to-orange-500'
        };
    }
  };

  const activeBarData = getFilteredCountAndLabel();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleManualSelect = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    const actionType: 'check-in' | 'check-out' = lastAction && lastAction.type === 'check-in' ? 'check-out' : 'check-in';
    setPendingScan({ attendee, actionType });
  };

  const confirmScan = () => {
    if (!pendingScan) return;
    addRecord(pendingScan.attendee, pendingScan.actionType);
    setPendingScan(null);
    setScanFeedback({
      type: 'success',
      message: `${pendingScan.actionType === 'check-in' ? 'Checked In' : 'Checked Out'}!`,
      detail: pendingScan.attendee.name,
    });
    setTimeout(() => setScanFeedback(null), 3000);
  };

  const cancelScan = () => setPendingScan(null);

  const handleSaveEventHeader = async () => {
    setIsSavingEvent(true);
    await updateEventConfig({
      title: eventTitleInput.trim(),
      imageUrl: eventImageInput.trim(),
    });
    setIsSavingEvent(false);
    setIsEditingEvent(false);
  };

  return (
    <div className="space-y-6">
      {/* ─── Compact Event Header Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden shadow-md group border border-gray-100 dark:border-slate-800 transition-all min-h-[140px] sm:min-h-[150px] flex items-center justify-center">
        {eventConfig?.imageUrl ? (
          <>
            <img 
              src={eventConfig.imageUrl} 
              alt="Event Header" 
              className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 absolute inset-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-orange-500" />
        )}

        <div className="relative inset-0 p-4 sm:p-5 flex flex-col justify-between text-white z-10 w-full h-full min-h-[140px]">
          <div className="flex justify-between items-start">
            <button
              onClick={() => {
                setEventTitleInput(eventConfig?.title || '');
                setEventImageInput(eventConfig?.imageUrl || '');
                setIsEditingEvent(true);
              }}
              className="ml-auto bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-xl transition-all border border-white/20 shadow-md active:scale-95"
              title="Edit Event Header"
            >
              <Edit2 size={15} />
            </button>
          </div>

          <div className="text-center my-auto">
            {eventConfig?.title ? (
              <h1 className="text-base sm:text-xl font-extrabold text-white drop-shadow-md uppercase tracking-wide leading-snug whitespace-normal break-words max-w-xl mx-auto">
                {eventConfig.title}
              </h1>
            ) : (
              <h1 className="text-xl font-bold drop-shadow">{greeting}!</h1>
            )}
            <p className="text-blue-100 text-xs mt-1 drop-shadow flex items-center justify-center gap-1.5">
              <span>{greeting}</span> · <span>{dateStr}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Edit Header Form Modal/Panel */}
      {isEditingEvent && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-blue-200 dark:border-blue-900 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
              <ImageIcon size={18} className="text-blue-600 dark:text-blue-400" /> Edit Event Header
            </h3>
            <button onClick={() => setIsEditingEvent(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                Event Title
              </label>
              <input 
                type="text" 
                value={eventTitleInput}
                onChange={e => setEventTitleInput(e.target.value)}
                placeholder="e.g. 1st Regular Session 2026"
                className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                Header Image URL
              </label>
              <input 
                type="url" 
                value={eventImageInput}
                onChange={e => setEventImageInput(e.target.value)}
                placeholder="https://example.com/banner-image.jpg"
                className="w-full px-3.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsEditingEvent(false)} 
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSaveEventHeader}
              disabled={isSavingEvent}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} /> {isSavingEvent ? 'Saving...' : 'Save Header'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Stat Cards Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Registered (Shows Ratio & Percentages of Will / Will Not) */}
        <div 
          onClick={() => setSelectedFilter('all')}
          className={`col-span-2 sm:col-span-1 rounded-2xl p-4 shadow-sm transition-all cursor-pointer border ${
            selectedFilter === 'all' 
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400 scale-[1.02]' 
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/80'
          }`}
        >
          <Users size={20} className="mb-1" />
          <p className="text-2xl font-bold">{totalAttendees}</p>
          <p className="text-xs opacity-90 font-semibold truncate mt-0.5">
            {willAttendCount} : {willNotAttendCount} ({willAttendPct}% / {willNotAttendPct}%)
          </p>
          <p className="text-[11px] opacity-75 font-medium mt-0.5">Total Registered</p>
        </div>

        {/* Will Attend (RSVP Yes) */}
        <div 
          onClick={() => setSelectedFilter('will-attend')}
          className={`rounded-2xl p-4 shadow-sm transition-all cursor-pointer border ${
            selectedFilter === 'will-attend'
              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400 scale-[1.02]'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
          }`}
        >
          <UserCheck2 size={20} className="mb-2" />
          <p className="text-2xl font-bold">{willAttendCount}</p>
          <p className="text-xs opacity-80 font-medium">Will Attend ({willAttendPct}%)</p>
        </div>

        {/* Will Not Attend (RSVP No) */}
        <div 
          onClick={() => setSelectedFilter('will-not-attend')}
          className={`rounded-2xl p-4 shadow-sm transition-all cursor-pointer border ${
            selectedFilter === 'will-not-attend'
              ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400 scale-[1.02]'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/80'
          }`}
        >
          <UserX2 size={20} className="mb-2" />
          <p className="text-2xl font-bold">{willNotAttendCount}</p>
          <p className="text-xs opacity-80 font-medium">Will Not Attend ({willNotAttendPct}%)</p>
        </div>

        {/* Present Today (Relative to Will Attend) */}
        <div 
          onClick={() => setSelectedFilter('present')}
          className={`rounded-2xl p-4 shadow-sm transition-all cursor-pointer border ${
            selectedFilter === 'present'
              ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-400 scale-[1.02]'
              : 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40 hover:bg-green-100 dark:hover:bg-green-900/80'
          }`}
        >
          <UserCheck size={20} className="mb-2" />
          <p className="text-2xl font-bold">{presentCount}</p>
          <p className="text-xs opacity-80 font-medium">Present ({willAttendCount > 0 ? Math.round((presentCount / willAttendCount) * 100) : 0}% of Will)</p>
        </div>

        {/* Absent Today (Relative to Will Attend) */}
        <div 
          onClick={() => setSelectedFilter('absent')}
          className={`rounded-2xl p-4 shadow-sm transition-all cursor-pointer border ${
            selectedFilter === 'absent'
              ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400 scale-[1.02]'
              : 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/80'
          }`}
        >
          <UserX size={20} className="mb-2" />
          <p className="text-2xl font-bold">{absentCount}</p>
          <p className="text-xs opacity-80 font-medium">Absent ({willAttendCount > 0 ? Math.round((absentCount / willAttendCount) * 100) : 0}% of Will)</p>
        </div>
      </div>

      {/* ─── Dynamic Status Bar Card ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 transition-all">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
              {activeBarData.label}
            </h3>
            {selectedFilter !== 'all' && (
              <button 
                onClick={() => setSelectedFilter('all')} 
                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md"
              >
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {activeBarData.pct}%
          </span>
        </div>

        {/* Animated Status Bar */}
        <div className="relative w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${activeBarData.colorClass} rounded-full transition-all duration-700 ease-out`} 
            style={{ width: `${activeBarData.pct}%` }} 
          />
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
          {activeBarData.count} of {activeBarData.totalBenchmark} ({activeBarData.pct}%)
        </p>
      </div>

      {/* Manual Entry */}
      <AttendeeSearch onSelect={handleManualSelect} />

      {/* Confirmation Modal */}
      {pendingScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-bounce-in">
            <div className="p-6 text-center">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">Confirm Attendance</p>
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

      {/* Feedback Toast */}
      {scanFeedback && (
        <div className={`rounded-xl p-4 flex items-center gap-3 animate-bounce-in ${scanFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800' : scanFeedback.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800' : 'bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800'}`}>
          {scanFeedback.type === 'success' ? <CheckCircle size={22} className="text-green-600 dark:text-green-400 shrink-0" /> : scanFeedback.type === 'warning' ? <AlertTriangle size={22} className="text-yellow-600 dark:text-yellow-400 shrink-0" /> : <XCircle size={22} className="text-orange-600 dark:text-orange-400 shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${scanFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : scanFeedback.type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' : 'text-orange-800 dark:text-orange-300'}`}>{scanFeedback.message}</p>
            {scanFeedback.detail && <p className={`text-xs mt-0.5 ${scanFeedback.type === 'success' ? 'text-green-600 dark:text-green-400' : scanFeedback.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>{scanFeedback.detail}</p>}
          </div>
        </div>
      )}

      {/* Full-Width Today's Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-800 dark:text-white">Today's Attendance Log</h3>
          </div>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
            {todayRecords.length} scan{todayRecords.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          {todayRecords.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <Clock size={36} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium text-sm">No scans today yet</p>
              <p className="text-xs mt-1">Attendance will appear here in real time</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {todayRecords.map((record, idx) => (
                <div key={record.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${idx === 0 ? 'animate-fade-in' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getInitialsBg(record.attendeeName)}`}>{getInitials(record.attendeeName)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{record.attendeeName}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{record.attendeeDepartment}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${record.type === 'check-in' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400'}`}>
                      {record.type === 'check-in' ? '↓ Check In' : '↑ Check Out'}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {todayRecords.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800">
            <button onClick={() => onNavigate('log')} className="w-full text-center text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">View Full Log →</button>
          </div>
        )}
      </div>
    </div>
  );
}