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
import { Attendee, AttendanceRecord } from './types';
import { isGoogleSheetsConfigured, GOOGLE_SHEETS_CONFIG } from './googleSheets';

// ─── localStorage keys ───
const LS_ATTENDEES = 'attendease_attendees';
const LS_RECORDS = 'attendease_records';
const LS_DELETED_RECORDS = 'attendease_deleted_record_ids';
const LS_DELETED_ATTENDEES = 'attendease_deleted_attendee_ids';

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

// ─── Context type ───
interface DataContextType {
  attendees: Attendee[];
  records: AttendanceRecord[];
  todayRecords: AttendanceRecord[];
  loading: boolean;
  synced: boolean;
  refreshData: () => Promise<void>;

  addAttendee: (data: Omit<Attendee, 'id' | 'createdAt'>) => Promise<Attendee>;
  updateAttendee: (attendee: Attendee) => Promise<void>;
  deleteAttendee: (id: string) => Promise<void>;
  getAttendeeById: (id: string) => Attendee | undefined;

  addRecord: (attendee: Attendee, type: 'check-in' | 'check-out') => Promise<AttendanceRecord>;
  deleteRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
  getAttendeeLastAction: (attendeeId: string) => AttendanceRecord | undefined;
}

const DataContext = createContext<DataContextType>(null!);

function seedDefaults(): Attendee[] {
  return [
    { id: 'demo-001', name: 'Alice Johnson', email: 'alice@company.com', department: 'Engineering', position: 'Software Engineer', phone: '+1 (555) 123-4567', createdAt: new Date().toISOString() },
    { id: 'demo-002', name: 'Bob Smith', email: 'bob@company.com', department: 'Design Office', position: 'UI/UX Designer', phone: '+1 (555) 234-5678', createdAt: new Date().toISOString() },
    { id: 'demo-003', name: 'Carol Davis', email: 'carol@company.com', department: 'Marketing', position: 'Marketing Manager', phone: '+1 (555) 345-6789', createdAt: new Date().toISOString() },
    { id: 'demo-004', name: 'David Lee', email: 'david@company.com', department: 'Engineering', position: 'DevOps Engineer', phone: '+1 (555) 456-7890', createdAt: new Date().toISOString() },
    { id: 'demo-005', name: 'Eva Martinez', email: 'eva@company.com', department: 'HR Office', position: 'HR Specialist', phone: '+1 (555) 567-8901', createdAt: new Date().toISOString() },
  ];
}

// ─── Google Sheets API ───
async function gsGet(): Promise<{ attendees: Attendee[]; records: AttendanceRecord[] }> {
  const url = `${GOOGLE_SHEETS_CONFIG.WEB_APP_URL}?action=getAll&t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch');
  return {
    attendees: (data.attendees || []).sort((a: Attendee, b: Attendee) => a.name.localeCompare(b.name)),
    records: (data.records || []).sort((a: AttendanceRecord, b: AttendanceRecord) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
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

// ─── Provider ───
export function DataProvider({ children }: { children: ReactNode }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const synced = isGoogleSheetsConfigured();

  // Tombstones — IDs the user deleted locally, filter them out even if server is stale
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
    // Skip refresh if a mutation was very recent (prevents stale read overwrite)
    if (Date.now() - mutationCooldownRef.current < 2500) return;

    if (synced) {
      try {
        const data = await gsGet();
        const filtered = applyTombstones(data.attendees, data.records);
        setAttendees(filtered.attendees);
        setRecords(filtered.records);
        lsSet(LS_ATTENDEES, filtered.attendees);
        lsSet(LS_RECORDS, filtered.records);
      } catch (err) {
        console.error('GS fetch failed:', err);
        const a = lsGet<Attendee>(LS_ATTENDEES);
        const r = lsGet<AttendanceRecord>(LS_RECORDS);
        const filtered = applyTombstones(a, r);
        setAttendees(filtered.attendees);
        setRecords(filtered.records);
      }
    } else {
      let stored = lsGet<Attendee>(LS_ATTENDEES);
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

  // ── Attendees ──
  const addAttendeeFn = useCallback(async (data: Omit<Attendee, 'id' | 'createdAt'>) => {
    const attendee: Attendee = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
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
    setAttendees(prev => prev.map(a => a.id === attendee.id ? attendee : a));
    const next = lsGet<Attendee>(LS_ATTENDEES).map(a => a.id === attendee.id ? attendee : a);
    lsSet(LS_ATTENDEES, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      try {
        await gsPost('updateAttendee', { attendee });
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

  // ── Records ──
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

  const deleteRecordFn = useCallback(async (id: string) => {
    // Tombstone first — ensures it never reappears
    deletedRecordIdsRef.current.add(id);
    lsSetSet(LS_DELETED_RECORDS, deletedRecordIdsRef.current);

    const next = records.filter(r => r.id !== id);
    setRecords(next);
    lsSet(LS_RECORDS, next);
    mutationCooldownRef.current = Date.now();

    if (synced) {
      // Try single-row delete first, then full replace as fallback
      try {
        await gsPost('deleteRecord', { id });
      } catch (e) {
        console.warn('deleteRecord single failed, trying replaceRecords', e);
      }
      // Always also replace the full list — guarantees deletion
      try {
        await gsPost('replaceRecords', { records: next });
      } catch (err) {
        console.error('replaceRecords failed', err);
      }
      // Verify after a delay
      setTimeout(refreshData, 1500);
    }
  }, [synced, records, refreshData]);

  const clearRecordsFn = useCallback(async () => {
    // Tombstone all current records
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

  return (
    <DataContext.Provider
      value={{
        attendees,
        records,
        todayRecords,
        loading,
        synced,
        refreshData,
        addAttendee: addAttendeeFn,
        updateAttendee: updateAttendeeFn,
        deleteAttendee: deleteAttendeeFn,
        getAttendeeById,
        addRecord: addRecordFn,
        deleteRecord: deleteRecordFn,
        clearRecords: clearRecordsFn,
        getAttendeeLastAction,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
