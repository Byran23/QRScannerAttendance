import { useState, useRef, useEffect } from 'react';
import { Search, Keyboard, ChevronDown, ChevronUp } from 'lucide-react';
import { Attendee } from '../types';
import { getInitials, getInitialsBg } from '../utils/initials';
import { useData } from '../DataContext';

interface AttendeeSearchProps {
  onSelect: (attendee: Attendee) => void;
}

export default function AttendeeSearch({ onSelect }: AttendeeSearchProps) {
  const { attendees, getAttendeeLastAction } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length > 0
    ? attendees.filter(a =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.email.toLowerCase().includes(query.toLowerCase()) ||
        a.department.toLowerCase().includes(query.toLowerCase()) ||
        a.position.toLowerCase().includes(query.toLowerCase())
      )
    : attendees;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (attendee: Attendee) => {
    onSelect(attendee);
    setQuery('');
    setShowDropdown(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (highlightIndex >= 0 && highlightIndex < filtered.length) handleSelect(filtered[highlightIndex]); else if (filtered.length === 1) handleSelect(filtered[0]); }
    else if (e.key === 'Escape') { setShowDropdown(false); setHighlightIndex(-1); }
  };

  const getStatusLabel = (attendee: Attendee) => {
    const lastAction = getAttendeeLastAction(attendee.id);
    if (!lastAction) return { label: 'Absent', cls: 'text-gray-400 dark:text-slate-500' };
    if (lastAction.type === 'check-in') return { label: 'Present', cls: 'text-green-600 dark:text-green-400' };
    return { label: 'Left', cls: 'text-orange-600 dark:text-orange-400' };
  };

  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-search-item]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors overflow-visible">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100); }}
        className="w-full px-5 py-4 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
          <Keyboard size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="font-medium">Manual Entry</span>
          <span className="text-xs text-gray-400 dark:text-slate-500">— Search by name</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-gray-400 dark:text-slate-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 animate-fade-in">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              ref={inputRef} type="text" value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); setHighlightIndex(-1); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type a name to search attendees..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 text-sm transition-colors"
              autoComplete="off"
            />
            {showDropdown && (
              <div ref={dropdownRef} className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Search size={24} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">No attendees found</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{query ? `No match for "${query}"` : 'No attendees registered yet'}</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {query.trim().length === 0 && <p className="px-4 py-2 text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">All attendees ({filtered.length})</p>}
                    {filtered.map((attendee, idx) => {
                      const status = getStatusLabel(attendee);
                      const isHighlighted = idx === highlightIndex;
                      return (
                        <button key={attendee.id} data-search-item onClick={() => handleSelect(attendee)} onMouseEnter={() => setHighlightIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isHighlighted ? 'bg-blue-50 dark:bg-blue-950/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                          <div className={`w-9 h-9 rounded-full ${getInitialsBg(attendee.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{getInitials(attendee.name)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{highlightName(attendee.name, query)}</p>
                              <span className={`text-[10px] font-medium ${status.cls}`}>{status.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-400 dark:text-slate-500 truncate">{attendee.department}</span>
                              <span className="text-xs text-gray-300 dark:text-slate-600">·</span>
                              <span className="text-xs text-gray-400 dark:text-slate-500 truncate">{attendee.position}</span>
                            </div>
                          </div>
                          {isHighlighted && <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium shrink-0 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">Enter ↵</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1">
            <span className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-[9px] font-mono">↑↓</span> navigate
            <span className="mx-1">·</span>
            <span className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-[9px] font-mono">Enter</span> select
            <span className="mx-1">·</span>
            <span className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-[9px] font-mono">Esc</span> close
          </p>
        </div>
      )}
    </div>
  );
}

function highlightName(name: string, query: string) {
  if (!query.trim()) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return <>{name.slice(0, idx)}<span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">{name.slice(idx, idx + query.length)}</span>{name.slice(idx + query.length)}</>;
}
