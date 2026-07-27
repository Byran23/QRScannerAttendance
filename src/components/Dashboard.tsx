import { useState } from 'react';
import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon, Edit2, Save, X } from 'lucide-react';
import { Page, Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';
import AttendeeSearch from './AttendeeSearch';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { attendees, todayRecords, addRecord, getAttendeeLastAction, eventConfig, updateEventConfig } = useData();

  const [pendingScan, setPendingScan] = useState<{ attendee: Attendee; actionType: 'check-in' | 'check-out' } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; detail?: string } | null>(null);

  // Event Config Edit Modal / Inline State
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventTitleInput, setEventTitleInput] = useState(eventConfig?.title || '');
  const [eventImageInput, setEventImageInput] = useState(eventConfig?.imageUrl || '');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const checkedInToday = new Set(todayRecords.filter(r => r.type === 'check-in').map(r => r.attendeeId));
  const presentIds = new Set<string>();
  for (const id of checkedInToday) {
    const last = todayRecords.find(r => r.attendeeId === id);
    if (last && last.type === 'check-in') presentIds.add(id);
  }

  const totalAttendees = attendees.length;
  const presentCount = presentIds.size;
  const absentCount = totalAttendees - checkedInToday.size;

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

  const attendancePct = totalAttendees > 0 ? Math.round((checkedInToday.size / totalAttendees) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ─── Event Header Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl group border border-gray-100 dark:border-slate-800 transition-all">
        {/* Background Image or Gradient */}
        {eventConfig?.imageUrl ? (
          <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-900">
            <img 
              src={eventConfig.imageUrl} 
              alt="Event Header" 
              className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </div>
        ) : (
          <div className="h-44 sm:h-48 w-full bg-gradient-to-br from-blue-600 via-blue-500 to-orange-500" />
        )}

        {/* Text Content Overlay */}
        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white z-10">
          <div className="flex justify-between items-start">
            <button
              onClick={() => {
                setEventTitleInput(eventConfig?.title || '');
                setEventImageInput(eventConfig?.imageUrl || '');
                setIsEditingEvent(true);
              }}
              className="ml-auto bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all border border-white/20 shadow-md"
              title="Edit Event Title and Header Image"
            >
              <Edit2 size={13} /> Edit Header
            </button>
          </div>

          <div>
            {eventConfig?.title ? (
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-md uppercase tracking-wide">
                {eventConfig.title}
              </h1>
            ) : (
              <h1 className="text-2xl font-bold drop-shadow">{greeting}!</h1>
            )}
            <p className="text-blue-100 text-xs sm:text-sm mt-1 drop-shadow flex items-center gap-2">
              <span>{greeting}</span> · <span>{dateStr}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Edit Header Modal/Panel */}
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
                Event Title for Today (Logged to Sheet Column J)
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
                Header Image URL (Logged to Sheet Column K)
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl p-4 shadow-sm transition-colors">
          <Users size={20} className="mb-2" />
          <p className="text-2xl font-bold">{totalAttendees}</p>
          <p className="text-xs opacity-75">Total</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-2xl p-4 shadow-sm transition-colors">
          <UserCheck size={20} className="mb-2" />
          <p className="text-2xl font-bold">{presentCount}</p>
          <p className="text-xs opacity-75">Present</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-2xl p-4 shadow-sm transition-colors">
          <UserX size={20} className="mb-2" />
          <p className="text-2xl font-bold">{absentCount}</p>
          <p className="text-xs opacity-75">Absent</p>
        </div>
      </div>

      {/* Attendance Rate */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Attendance Rate</h3>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{attendancePct}%</span>
        </div>
        <div className="relative w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-orange-500 rounded-full transition-all duration-1000" style={{ width: `${attendancePct}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{checkedInToday.size} of {totalAttendees} attendees checked in today</p>
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