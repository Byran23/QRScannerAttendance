import { useState } from 'react';
import { Clock, Trash2, Download, Filter, Search, Users2, LayoutGrid, Calendar } from 'lucide-react';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';
import SwipeableRow from './SwipeableRow';

export default function AttendanceLog() {
  const { records, attendees, deleteRecord, clearRecords } = useData();
  const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out'>('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterTable, setFilterTable] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Quick lookup map for attendee meta details
  const attendeeMetaMap = new Map(attendees.map(a => [a.id, a]));

  // ─── Filter Options Sorting ───

  // Departments (Alphabetical)
  const departments = [...new Set(attendees.map(a => a.department).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Groups (Alphabetical A-Z)
  const groups = [...new Set(attendees.map(a => a.group).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Table Numbers (Lowest to Highest Numerically)
  const tables = [...new Set(attendees.map(a => a.tableNo).filter(Boolean))]
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

  const filtered = records.filter(r => {
    const attendee = attendeeMetaMap.get(r.attendeeId);
    const group = attendee?.group || '';
    const tableNo = attendee?.tableNo || '';
    const position = attendee?.position || '';
    const department = r.attendeeDepartment || attendee?.department || '';

    const matchesType = filter === 'all' || r.type === filter;
    const matchesSearch =
      r.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
      department.toLowerCase().includes(search.toLowerCase()) ||
      position.toLowerCase().includes(search.toLowerCase()) ||
      group.toLowerCase().includes(search.toLowerCase()) ||
      tableNo.toLowerCase().includes(search.toLowerCase());

    const matchesDept = filterDept === 'all' || department === filterDept;
    const matchesGroup = filterGroup === 'all' || group === filterGroup;
    const matchesTable = filterTable === 'all' || tableNo === filterTable;

    const matchesDate =
      !dateFilter || new Date(r.timestamp).toLocaleDateString('en-CA') === dateFilter;

    return matchesType && matchesSearch && matchesDept && matchesGroup && matchesTable && matchesDate;
  });

  const grouped: Record<string, typeof filtered> = {};
  for (const record of filtered) {
    const k = new Date(record.timestamp).toDateString();
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(record);
  }

  const handleClear = () => {
    clearRecords();
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const csv =
      'Name,Department/Office,Position,Group,Table No.,Type,Date,Time\n' +
      filtered
        .map(r => {
          const attendee = attendeeMetaMap.get(r.attendeeId);
          const d = new Date(r.timestamp);
          return `"${r.attendeeName}","${r.attendeeDepartment}","${attendee?.position || ''}","${attendee?.group || ''}","${attendee?.tableNo || ''}","${r.type}","${d.toLocaleDateString()}","${d.toLocaleTimeString()}"`;
        })
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Log</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            {records.length} total records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={records.length === 0}
            className="bg-orange-100 dark:bg-orange-950/50 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:bg-gray-100 dark:disabled:bg-slate-800 text-orange-600 dark:text-orange-400 disabled:text-gray-400 dark:disabled:text-slate-600 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center justify-between">
          <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">
            ⚠️ Clear all records? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="space-y-2.5">
        {/* Row 1: Longest Search Bar */}
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder="Search name, position, department, group, or table..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-sm"
          />
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {/* Type Filter */}
          <div className="relative">
            <Filter
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as typeof filter)}
              className="w-full pl-8 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Types</option>
              <option value="check-in">Check-in Only</option>
              <option value="check-out">Check-out Only</option>
            </select>
          </div>

          {/* Department Filter (Alphabetical) */}
          <div className="relative">
            <Filter
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full pl-8 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Depts</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Group Filter (Alphabetical A-Z) */}
          <div className="relative">
            <Users2
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              className="w-full pl-8 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Groups</option>
              {groups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Table Filter (Sorted Lowest to Highest) */}
          <div className="relative">
            <LayoutGrid
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <select
              value={filterTable}
              onChange={e => setFilterTable(e.target.value)}
              className="w-full pl-8 pr-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs appearance-none cursor-pointer truncate"
            >
              <option value="all">All Tables</option>
              {tables.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative col-span-2 sm:col-span-4 md:col-span-1">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-xs transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Swipe hint */}
      {filtered.length > 0 && (
        <p className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-gray-300 dark:bg-slate-600 rounded" />
          Swipe left on a record to delete it
          <span className="inline-block w-4 h-0.5 bg-gray-300 dark:bg-slate-600 rounded" />
        </p>
      )}

      {/* Records List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 transition-colors">
          <Clock size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No records found</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">
            {search || dateFilter || filter !== 'all' || filterDept !== 'all' || filterGroup !== 'all' || filterTable !== 'all'
              ? 'Try adjusting your filters'
              : 'Scan QR codes to start recording attendance'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateRecords]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {dateRecords.length} record{dateRecords.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              </div>

              <div className="space-y-2">
                {dateRecords.map(record => {
                  const attendee = attendeeMetaMap.get(record.attendeeId);

                  return (
                    <SwipeableRow key={record.id} onDelete={() => deleteRecord(record.id)}>
                      <div className="bg-white dark:bg-slate-900 p-4 shadow-sm border border-gray-100 dark:border-slate-800 flex items-start gap-4 select-none cursor-default rounded-xl">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${getInitialsBg(
                            record.attendeeName,
                          )}`}
                        >
                          {getInitials(record.attendeeName)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Attendee Name */}
                          <p className="font-semibold text-gray-800 dark:text-white truncate">
                            {record.attendeeName}
                          </p>

                          {/* Line 1: Department & Position */}
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {record.attendeeDepartment}{attendee?.position ? ` · ${attendee.position}` : ''}
                          </p>

                          {/* Line 2: Group & Table No. Badges placed directly below Department and Position */}
                          {(attendee?.group || attendee?.tableNo) && (
                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                              {attendee?.group && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-900">
                                  <Users2 size={11} className="text-blue-600 dark:text-blue-400" />
                                  {attendee.group}
                                </span>
                              )}

                              {attendee?.tableNo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-700/80 shadow-sm">
                                  <LayoutGrid size={11} className="text-amber-600 dark:text-amber-400" />
                                  {attendee.tableNo.toLowerCase().includes('table') ? attendee.tableNo : `Table ${attendee.tableNo}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${
                              record.type === 'check-in'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400'
                            }`}
                          >
                            {record.type === 'check-in' ? 'Check In' : 'Check Out'}
                          </span>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
                            {new Date(record.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </SwipeableRow>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}