// ─── Event Header Configuration (Synced with AdminPins Sheet Cols J & K) ───
export interface EventConfig {
  title: string;      // Column J in AdminPins
  imageUrl: string;   // Column K in AdminPins
}

// ─── Attendee Profile (Synced with Attendees Sheet Cols A to K) ───
export interface Attendee {
  id: string;                    // Col A: Unique UUID
  name: string;                  // Col B: Full Name
  email: string;                 // Col C: Email Address
  department: string;            // Col D: Office / Department
  position: string;              // Col E: Job Title / Position
  phone?: string;                // Col F: Phone Number
  createdAt?: string;            // Col G: ISO Registration Date
  willAttend?: boolean | string; // Col H: Attendance Intention ("Will Attend" / "Will Not Attend")
  reason?: string;               // Col I: Reason for non-attendance
  group?: string;                // Col J: Group / Classification
  tableNo?: string;              // Col K: Assigned Table Number
}

// ─── Attendance Scan Record (Synced with Records Sheet) ───
export interface AttendanceRecord {
  id: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeDepartment: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
}

// ─── Page Navigation Routes ───
export type Page = 
  | 'dashboard' 
  | 'attendees' 
  | 'scanner' 
  | 'log' 
  | 'add-attendee' 
  | 'edit-attendee' 
  | 'qr-view';