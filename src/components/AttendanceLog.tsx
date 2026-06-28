import { useState } from 'react';
import { Clock, Trash2, Download, Filter, Search } from 'lucide-react';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

export default function AttendanceLog() {
  const { records, clearRecords } = useData();
  const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out'>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = records.filter(r => {
    const matchesType = filter === 'all' || r.type === filter;
    const matchesSearch = r.attendeeName.toLowerCase().includes(search.toLowerCase()) || r.attendeeEmail.toLowerCase().includes(search.toLowerCase()) || r.attendeeDepartment.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || new Date(r.timestamp).toLocaleDateString('en-CA') === dateFilter;
    return matchesType && matchesSearch && matchesDate;
  });

  const grouped: Record<string, typeof filtered> = {};
  for (const record of filtered) { const k = new Date(record.timestamp).toDateString(); if (!grouped[k]) grouped[k] = []; grouped[k].push(record); }

  const handleClear = () => { clearRecords(); setShowClearConfirm(false); };

  const handleExport = () => {
    const csv = 'Name,Email,Department/Office,Type,Date,Time\n' + filtered.map(r => { const d = new Date(r.timestamp); return `"${r.attendeeName}","${r.attendeeEmail}","${r.attendeeDepartment}","${r.type}","${d.toLocaleDateString()}","${d.toLocaleTimeString()}"`; }).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `attendance-log-${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Log</h2><p className="text-gray-500 dark:text-slate-400 text-sm">{records.length} total records</p></div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={filtered.length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"><Download size={16} />Export CSV</button>
          <button onClick={() => setShowClearConfirm(true)} disabled={records.length === 0} className="bg-orange-100 dark:bg-orange-950/50 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:bg-gray-100 dark:disabled:bg-slate-800 text-orange-600 dark:text-orange-400 disabled:text-gray-400 dark:disabled:text-slate-600 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"><Trash2 size={16} />Clear</button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">⚠️ Clear all records? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700">Cancel</button>
            <button onClick={handleClear} className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Clear All</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" /><input type="text" placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 transition-colors" /></div>
        <div className="flex gap-2">
          <div className="relative"><Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" /><select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="pl-10 pr-6 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white appearance-none cursor-pointer text-sm transition-colors"><option value="all">All Types</option><option value="check-in">Check-in Only</option><option value="check-out">Check-out Only</option></select></div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm transition-colors" />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 transition-colors">
          <Clock size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No records found</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{search || dateFilter || filter !== 'all' ? 'Try adjusting your filters' : 'Scan QR codes to start recording attendance'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateRecords]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500">{dateRecords.length} records</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {dateRecords.map(record => (
                  <div key={record.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getInitialsBg(record.attendeeName)}`}>{getInitials(record.attendeeName)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white truncate">{record.attendeeName}</p>
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-gray-400 dark:text-slate-500">{record.attendeeEmail}</span><span className="text-xs text-gray-300 dark:text-slate-600">•</span><span className="text-xs text-gray-400 dark:text-slate-500">{record.attendeeDepartment}</span></div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${record.type === 'check-in' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400'}`}>{record.type === 'check-in' ? 'Check In' : 'Check Out'}</span>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
