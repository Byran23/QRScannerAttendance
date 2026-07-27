export interface Attendee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  createdAt: string;
  willAttend?: boolean | string; // Column H in Google Sheets
  reason?: string;               // Column I in Google Sheets
  group?: string;                // Column J in Google Sheets
  tableNo?: string;              // Column K in Google Sheets
}

export interface AttendanceRecord {
  id: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeDepartment: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
}

export type Page = 'dashboard' | 'attendees' | 'scanner' | 'log' | 'add-attendee' | 'edit-attendee' | 'qr-view';