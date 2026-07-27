import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Attendee, AttendanceRecord, EventConfig } from './types';
import { isGoogleSheetsConfigured, GOOGLE_SHEETS_CONFIG } from './googleSheets';

// ─── localStorage keys ───
const LS_ATTENDEES = 'attendease_attendees';
const LS_RECORDS = 'attendease_records';
const LS_DELETED_RECORDS = 'attendease_deleted_record_ids';
const LS_DELETED_ATTENDEES = 'attendease_deleted_attendee_ids';
const LS_EVENT_CONFIG = 'attendease_event_config';

function lsGet<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
function lsGetSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function lsSetSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

// ─── Helper to parse willAttend string/boolean ───
export function parseWillAttend(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (raw === 'will not attend' || raw === 'no' || raw === 'not attending') {
      return false;
    }
  }
  return true;
}

// ─── Context Interface ───
interface DataContextType {
  attendees: Attendee[];
  records: AttendanceRecord[];
  todayRecords: AttendanceRecord[];
  eventConfig: EventConfig;
  loading: boolean;
  synced: boolean;
  refreshData: () => Promise<void>;

  addAttendee: (data: Omit<Attendee, 'id' | 'createdAt'>) => Promise<Attendee>;
  updateAttendee: (attendee: Attendee) => Promise<void>;
  deleteAttendee: (id: string) => Promise<void>;
  getAttendeeById: (id: string) => Attendee | undefined;

  addRecord: (attendee: Attendee, type: 'check-in' | 'check-out') => Promise<AttendanceRecord>;
  checkInAttendee: (attendeeId: string) => Promise<AttendanceRecord | undefined>;
  deleteRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
  getAttendeeLastAction: (attendeeId: string) => AttendanceRecord | undefined;

  updateEventConfig: (config: EventConfig) => Promise<void>;
}

const DataContext = createContext<DataContextType>(null!);

function seedDefaults(): Attendee[] {
  return [
    { id: 'demo-001', name: 'Alice Johnson', email: 'alice@company.com', department: 'Engineering', position: 'Software Engineer', phone: '+1 (555) 123-4567', createdAt: new Date().toISOString(), willAttend: true, reason: '', group: 'Group A', tableNo: '1' },
    { id: 'demo-002', name: 'Bob Smith', email: 'bob@company.com', department: 'Design Office', position: 'UI/UX Designer', phone: '+1 (555) 234-5678', createdAt: new Date().toISOString(), willAttend: true, reason: '', group: 'Group B', tableNo: '2' },
    { id: 'demo-003', name: 'Carol Davis', email: 'carol@company.com', department: 'Marketing', position: 'Marketing Manager', phone: '+1 (555) 345-6789', createdAt: new Date().toISOString(), willAttend: true, reason: '', group: 'Group A', tableNo: '3' },
  ];
}

// ─── Google Sheets API Fetch ───
async function gsGet(): Promise<{ attendees: Attendee[]; records: AttendanceRecord[]; eventConfig: EventConfig }> {
  const url = `${GOOGLE_SHEETS_CONFIG.WEB_APP_URL}?action=getAll&t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch');

  const parsedAttendees: Attendee[] = (data.attendees || []).map((a: any) => ({
    id: String(a.id || ''),
    name: String(a.name || ''),
    email: String(a.email || ''),
    department: String(a.department || ''),
    position: String(a.position || ''),
    phone: String(a.phone || ''),
    createdAt: String(a.createdAt || ''),
    willAttend: parseWillAttend(a.willAttend),
    reason: String(a.reason || ''),
    group: String(a.group || ''),
    tableNo: String(a.tableNo || ''),
  }));

  const parsedConfig: EventConfig = {
    title: String(data.eventConfig?.title || ''),
    imageUrl: String(data.eventConfig?.imageUrl || ''),
  };

  return {
    attendees: parsedAttendees.sort((a, b) => a.name.localeCompare(b.name)),
    records: (data.records || []).sort((a: AttendanceRecord, b: AttendanceRecord) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    eventConfig: parsedConfig,
  };
}

async function gsPost(action: string, payload: Record<string, unknown>) {
  const res = await fetch(GOOGLE_SHEETS_CONFIG.WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed');
  return data;
}

// ─── Provider Component ───
export function DataProvider({ children }: { children: ReactNode }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    try {
      const saved = localStorage.getItem(LS_EVENT_CONFIG);
      return saved ? JSON.parse(saved) : { title: '', imageUrl: '' };
    } catch {
      return { title: '', imageUrl: '' };
    }
  });
  const [loading, setLoading] = useState(true);
  const synced = isGoogleSheetsConfigured();

  const deletedRecordIdsRef = useRef<Set<string>>(lsGetSet(LS_DELETED_RECORDS));
  const deletedAttendeeIdsRef = useRef<Set<string>>(lsGetSet(LS_DELETED_ATTENDEES));
  const mutationCooldownRef = useRef<number>(0);

  const applyTombstones = useCallback((attendeesData: Attendee[], recordsData: AttendanceRecord[]) => {
    const delR = deletedRecordIdsRef.current;
    const delA = deletedAttendeeIdsRef.current;
    return {
      attendees: delA.size ? attendeesData.filter(a => !delA.has(a.id)) : attendeesData,
      records: delR.size ? recordsData.filter(r => !delR.has(r.id)) : recordsData,
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (Date.now() - mutationCooldownRef.current < 2500) return;

    if (synced) {
      try {
        const data = await gsGet();
        const filtered = applyTombstones(data.attendees, data.records);
        setAttendees(filtered.attendees);
        setRecords(filtered.records);
        if (data.eventConfig) {
          setEventConfig(data.eventConfig);
          localStorage.setItem(LS_EVENT_CONFIG, JSON.stringify(data.eventConfig));
        }
        lsSet(LS_ATTENDEES, filtered.attendees);
        lsSet(LS_RECORDS, filtered.records);
      } catch (err) {
        console.error('GS fetch failed:', err);
        const a = lsGet<Attendee>(LS_ATTENDEES).map(item => ({ ...item, willAttend: parseWillAttend(item.willAttend) }));
        const r = lsGet<AttendanceRecord>(LS_RECORDS);
        const filtered = applyTombstones(a, r);
        setAttendees(filtered.attendees);
        setRecords(filtered.records);
      }
    } else {
      let stored = lsGet<Attendee>(LS_ATTENDEES).map(item => ({ ...item, willAttend: parseWillAttend(item.willAttend) }));
      if (stored.length === 0) {
        stored = seedDefaults();
        lsSet(LS_ATTENDEES, stored);
      }
      const rStored = lsGet<AttendanceRecord>(LS_RECORDS);
      const filtered = applyTombstones(stored, rStored);
      setAttendees(filtered.attendees);
      setRecords(filtered.records);
    }
    setLoading(false);
  }, [synced, applyTombstones]);

  useEffect(() => {
    refreshData();
    if (synced) {
      const interval = setInterval(refreshData, 4000);
      return () => clearInterval(interval);
    }
  }, [refreshData, synced]);

  const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString());

  // ── Attendees Functions ──
  const addAttendeeFn = useCallback(async (data: Omit<Attendee, 'id' | 'createdAt'>) => {
    const attendee: Attendee = { 
      ...data, 
      id: uuidv4(), 
      createdAt: new Date().toISOString(),
      willAttend: data.willAttend !== false,
      reason: data.reason || '',
      group: data.group || '',
      tableNo: data.tableNo || '',
    };
    setAttendees(prev => [...prev, attendee].sort((a,b)=>a.name.localeCompare(b.name)));
    const next = [...lsGet<Attendee>(LS_ATTENDEES), attendee];
    lsSet(LS_ATTENDEES, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('addAttendee', { attendee });
        setTimeout(refreshData, 1200);
      } catch (err) {
        console.error('addAttendee failed', err);
      }
    }
    return attendee;
  }, [synced, refreshData]);

  const updateAttendeeFn = useCallback(async (attendee: Attendee) => {
    const updated = {
      ...attendee,
      willAttend: attendee.willAttend !== false,
      reason: attendee.reason || '',
      group: attendee.group || '',
      tableNo: attendee.tableNo || '',
    };
    setAttendees(prev => prev.map(a => a.id === updated.id ? updated : a));
    const next = lsGet<Attendee>(LS_ATTENDEES).map(a => a.id === updated.id ? updated : a);
    lsSet(LS_ATTENDEES, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('updateAttendee', { attendee: updated });
        setTimeout(refreshData, 1200);
      } catch (err) {
        console.error('updateAttendee failed', err);
      }
    }
  }, [synced, refreshData]);

  const deleteAttendeeFn = useCallback(async (id: string) => {
    deletedAttendeeIdsRef.current.add(id);
    lsSetSet(LS_DELETED_ATTENDEES, deletedAttendeeIdsRef.current);

    setAttendees(prev => prev.filter(a => a.id !== id));
    const next = lsGet<Attendee>(LS_ATTENDEES).filter(a => a.id !== id);
    lsSet(LS_ATTENDEES, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('deleteAttendee', { id });
        setTimeout(refreshData, 1200);
      } catch (err) {
        console.error('deleteAttendee failed', err);
      }
    }
  }, [synced, refreshData]);

  const getAttendeeById = useCallback((id: string) => attendees.find(a => a.id === id), [attendees]);

  // ── Records Functions ──
  const addRecordFn = useCallback(async (attendee: Attendee, type: 'check-in' | 'check-out'): Promise<AttendanceRecord> => {
    const record: AttendanceRecord = {
      id: uuidv4(),
      attendeeId: attendee.id,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      attendeeDepartment: attendee.department,
      timestamp: new Date().toISOString(),
      type,
    };
    setRecords(prev => [record, ...prev]);
    const next = [record, ...lsGet<AttendanceRecord>(LS_RECORDS)];
    lsSet(LS_RECORDS, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('addRecord', { record });
        setTimeout(refreshData, 1200);
      } catch (err) {
        console.error('addRecord failed', err);
      }
    }
    return record;
  }, [synced, refreshData]);

  const checkInAttendeeFn = useCallback(async (attendeeId: string) => {
    const attendee = attendees.find(a => a.id === attendeeId);
    if (!attendee) return undefined;

    return await addRecordFn(attendee, 'check-in');
  }, [attendees, addRecordFn]);

  const deleteRecordFn = useCallback(async (id: string) => {
    const recordToDelete = records.find(r => r.id === id);
    const nextLocal = records.filter(r => r.id !== id);

    setRecords(nextLocal);
    lsSet(LS_RECORDS, nextLocal);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        const latest = await gsGet();
        const remoteNext = latest.records.filter(r => String(r.id).trim() !== String(id).trim());

        try {
          await gsPost('deleteRecord', { id, record: recordToDelete || null });
        } catch (singleErr) {
          console.warn('deleteRecord direct row delete failed, using replaceRecords', singleErr);
        }

        await gsPost('replaceRecords', { records: remoteNext });

        mutationCooldownRef.current = 0;
        await refreshData();
        return;
      } catch (err) {
        console.error('deleteRecord failed to sync to Google Sheets', err);
      }
    }

    mutationCooldownRef.current = 0;
  }, [synced, records, refreshData]);

  const clearRecordsFn = useCallback(async () => {
    records.forEach(r => deletedRecordIdsRef.current.add(r.id));
    lsSetSet(LS_DELETED_RECORDS, deletedRecordIdsRef.current);

    setRecords([]);
    lsSet(LS_RECORDS, []);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('clearRecords', {});
        setTimeout(refreshData, 1200);
      } catch (err) {
        console.error('clearRecords failed', err);
      }
    }
  }, [synced, records, refreshData]);

  const getAttendeeLastAction = useCallback(
    (attendeeId: string) => todayRecords.find(r => r.attendeeId === attendeeId),
    [todayRecords]
  );

  // ── Event Config Function ──
  const updateEventConfigFn = useCallback(async (config: EventConfig) => {
    setEventConfig(config);
    localStorage.setItem(LS_EVENT_CONFIG, JSON.stringify(config));

    if (synced) {
      try {
        await gsPost('updateEventConfig', { eventConfig: config });
      } catch (err) {
        console.error('Failed to update event config in Google Sheets', err);
      }
    }
  }, [synced]);

  return (
    <DataContext.Provider
      value={{
        attendees,
        records,
        todayRecords,
        eventConfig,
        loading,
        synced,
        refreshData,
        addAttendee: addAttendeeFn,
        updateAttendee: updateAttendeeFn,
        deleteAttendee: deleteAttendeeFn,
        getAttendeeById,
        addRecord: addRecordFn,
        checkInAttendee: checkInAttendeeFn,
        deleteRecord: deleteRecordFn,
        clearRecords: clearRecordsFn,
        getAttendeeLastAction,
        updateEventConfig: updateEventConfigFn,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}