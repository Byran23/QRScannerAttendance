import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Attendee, AttendanceRecord } from './types';
import { isGoogleSheetsConfigured, GOOGLE_SHEETS_CONFIG } from './googleSheets';

// ─── localStorage keys (fallback) ───
const LS_ATTENDEES = 'attendease_attendees';
const LS_RECORDS = 'attendease_records';

function lsGet<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Context type ───
interface DataContextType {
  attendees: Attendee[];
  records: AttendanceRecord[];
  todayRecords: AttendanceRecord[];
  loading: boolean;
  synced: boolean;
  refreshData: () => Promise<void>;

  addAttendee: (data: Omit<Attendee, 'id' | 'createdAt'>) => Promise<void>;
  updateAttendee: (attendee: Attendee) => Promise<void>;
  deleteAttendee: (id: string) => Promise<void>;
  getAttendeeById: (id: string) => Attendee | undefined;

  addRecord: (attendee: Attendee, type: 'check-in' | 'check-out') => Promise<AttendanceRecord>;
  clearRecords: () => Promise<void>;
  getAttendeeLastAction: (attendeeId: string) => AttendanceRecord | undefined;
}

const DataContext = createContext<DataContextType>(null!);

// ─── Seed demo data ───
function seedDefaults(): Attendee[] {
  return [
    { id: 'demo-001', name: 'Alice Johnson', email: 'alice@company.com', department: 'Engineering', position: 'Software Engineer', phone: '+1 (555) 123-4567', createdAt: new Date().toISOString() },
    { id: 'demo-002', name: 'Bob Smith', email: 'bob@company.com', department: 'Design Office', position: 'UI/UX Designer', phone: '+1 (555) 234-5678', createdAt: new Date().toISOString() },
    { id: 'demo-003', name: 'Carol Davis', email: 'carol@company.com', department: 'Marketing', position: 'Marketing Manager', phone: '+1 (555) 345-6789', createdAt: new Date().toISOString() },
    { id: 'demo-004', name: 'David Lee', email: 'david@company.com', department: 'Engineering', position: 'DevOps Engineer', phone: '+1 (555) 456-7890', createdAt: new Date().toISOString() },
    { id: 'demo-005', name: 'Eva Martinez', email: 'eva@company.com', department: 'HR Office', position: 'HR Specialist', phone: '+1 (555) 567-8901', createdAt: new Date().toISOString() },
  ];
}

// ─── Google Sheets API helpers ───
async function gsGet(): Promise<{ attendees: Attendee[]; records: AttendanceRecord[] }> {
  const url = `${GOOGLE_SHEETS_CONFIG.WEB_APP_URL}?action=getAll&t=${Date.now()}`;
  const res = await fetch(url);
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
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requirement
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to save');
  return data;
}

// ─── Provider ───
export function DataProvider({ children }: { children: ReactNode }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const synced = isGoogleSheetsConfigured();

  // Fetch data from Google Sheets or localStorage
  const refreshData = useCallback(async () => {
    if (synced) {
      try {
        const data = await gsGet();
        setAttendees(data.attendees);
        setRecords(data.records);
        // Mirror to localStorage for offline fallback
        lsSet(LS_ATTENDEES, data.attendees);
        lsSet(LS_RECORDS, data.records);
      } catch (err) {
        console.error('Failed to fetch from Google Sheets:', err);
        // Fall back to localStorage
        setAttendees(lsGet<Attendee>(LS_ATTENDEES));
        setRecords(lsGet<AttendanceRecord>(LS_RECORDS));
      }
    } else {
      // localStorage only
      let stored = lsGet<Attendee>(LS_ATTENDEES);
      if (stored.length === 0) {
        stored = seedDefaults();
        lsSet(LS_ATTENDEES, stored);
      }
      setAttendees(stored);
      setRecords(lsGet<AttendanceRecord>(LS_RECORDS));
    }
    setLoading(false);
  }, [synced]);

  // Initial load + polling for updates
  useEffect(() => {
    refreshData();
    
    if (synced) {
      // Poll every 5 seconds for updates from other devices
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [refreshData, synced]);

  // Derived: today's records
  const todayRecords = records.filter(
    r => new Date(r.timestamp).toDateString() === new Date().toDateString()
  );

  // ─── CRUD: Attendees ───
  const addAttendeeFn = useCallback(async (data: Omit<Attendee, 'id' | 'createdAt'>) => {
    const attendee: Attendee = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setAttendees(prev => [...prev, attendee].sort((a, b) => a.name.localeCompare(b.name)));

    if (synced) {
      try {
        await gsPost('addAttendee', { attendee });
      } catch (err) {
        console.error('Failed to add attendee:', err);
      }
    }
    
    // Always save to localStorage
    const next = [...lsGet<Attendee>(LS_ATTENDEES), attendee];
    lsSet(LS_ATTENDEES, next);
  }, [synced]);

  const updateAttendeeFn = useCallback(async (attendee: Attendee) => {
    // Optimistic update
    setAttendees(prev => prev.map(a => a.id === attendee.id ? attendee : a));

    if (synced) {
      try {
        await gsPost('updateAttendee', { attendee });
      } catch (err) {
        console.error('Failed to update attendee:', err);
      }
    }
    
    const next = lsGet<Attendee>(LS_ATTENDEES).map(a => a.id === attendee.id ? attendee : a);
    lsSet(LS_ATTENDEES, next);
  }, [synced]);

  const deleteAttendeeFn = useCallback(async (id: string) => {
    // Optimistic update
    setAttendees(prev => prev.filter(a => a.id !== id));

    if (synced) {
      try {
        await gsPost('deleteAttendee', { id });
      } catch (err) {
        console.error('Failed to delete attendee:', err);
      }
    }
    
    const next = lsGet<Attendee>(LS_ATTENDEES).filter(a => a.id !== id);
    lsSet(LS_ATTENDEES, next);
  }, [synced]);

  const getAttendeeById = useCallback(
    (id: string) => attendees.find(a => a.id === id),
    [attendees]
  );

  // ─── CRUD: Records ───
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

    // Optimistic update
    setRecords(prev => [record, ...prev]);

    if (synced) {
      try {
        await gsPost('addRecord', { record });
      } catch (err) {
        console.error('Failed to add record:', err);
      }
    }
    
    const next = [record, ...lsGet<AttendanceRecord>(LS_RECORDS)];
    lsSet(LS_RECORDS, next);
    
    return record;
  }, [synced]);

  const clearRecordsFn = useCallback(async () => {
    // Optimistic update
    setRecords([]);

    if (synced) {
      try {
        await gsPost('clearRecords', {});
      } catch (err) {
        console.error('Failed to clear records:', err);
      }
    }
    
    lsSet(LS_RECORDS, []);
  }, [synced]);

  const getAttendeeLastAction = useCallback(
    (attendeeId: string): AttendanceRecord | undefined => {
      return todayRecords.find(r => r.attendeeId === attendeeId);
    },
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
