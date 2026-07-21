import { Attendee } from './types';

// ============================================================
//  📊 GOOGLE SHEETS CONFIGURATION
//
//  To enable Google Sheets as your database:
//
//  1. Create a new Google Sheet
//  2. Create three sheets (tabs) named exactly:
//     - "Attendees"
//     - "Records"
//     - "AdminPins"
//  3. In Attendees sheet, add headers in Row 1 (Cols A to I):
//     id | name | email | department | position | phone | createdAt | willAttend | reason
//  4. In Records sheet, add headers in Row 1:
//     id | attendeeId | attendeeName | attendeeEmail | attendeeDepartment | timestamp | type
//  5. Go to Extensions → Apps Script
//  6. Delete any code there and paste your Google Apps Script code
//  7. Click Deploy → New deployment → Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  8. Copy the Web App URL and paste it below
//
//  If the URL is empty, the app uses localStorage (single-device).
// ============================================================

export const GOOGLE_SHEETS_CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here:
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwFsaXgZcIatk_zGKIRf3cV6kKOCQE5axdZF9J1gqtS17qjWZI1O0U5LskAJTawviIg/exec',
};

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    GOOGLE_SHEETS_CONFIG.WEB_APP_URL &&
    GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com')
  );
}

/**
 * Normalizes 'willAttend' values returned from Google Sheets.
 * Converts strings like "Will Not Attend", "false", or "no" to boolean `false`.
 */
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

/**
 * Safely converts raw Google Sheet objects into clean Attendee records
 */
export function parseSheetAttendee(raw: Record<string, any>): Attendee {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    email: String(raw.email || ''),
    department: String(raw.department || ''),
    position: String(raw.position || ''),
    phone: String(raw.phone || ''),
    createdAt: String(raw.createdAt || ''),
    willAttend: parseWillAttend(raw.willAttend),
    reason: String(raw.reason || ''),
  };
}

/**
 * Fetch PINs from Google Sheets AdminPins tab
 */
export async function fetchAdminPins(): Promise<string[]> {
  if (!isGoogleSheetsConfigured()) return [];
  const url = `${GOOGLE_SHEETS_CONFIG.WEB_APP_URL}?action=getPins&t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch pins');

  return (data.pins || [])
    .map((pin: unknown) => String(pin).trim())
    .filter((pin: string) => pin.length > 0)
    .map((pin: string) => pin.padStart(4, '0'));
}

/**
 * Send a new Attendee record to Google Sheets (including Columns H & I)
 */
export async function addAttendeeToSheet(attendee: Attendee): Promise<Attendee> {
  if (!isGoogleSheetsConfigured()) return attendee;

  const payload = {
    action: 'addAttendee',
    attendee: {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      department: attendee.department,
      position: attendee.position,
      phone: attendee.phone || '',
      createdAt: attendee.createdAt,
      willAttend: attendee.willAttend !== false,
      reason: attendee.reason || '',
    },
  };

  const response = await fetch(GOOGLE_SHEETS_CONFIG.WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to add attendee to sheet');

  return attendee;
}

/**
 * Update an existing Attendee record in Google Sheets
 */
export async function updateAttendeeInSheet(attendee: Attendee): Promise<Attendee> {
  if (!isGoogleSheetsConfigured()) return attendee;

  const payload = {
    action: 'updateAttendee',
    attendee: {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      department: attendee.department,
      position: attendee.position,
      phone: attendee.phone || '',
      createdAt: attendee.createdAt,
      willAttend: attendee.willAttend !== false,
      reason: attendee.reason || '',
    },
  };

  const response = await fetch(GOOGLE_SHEETS_CONFIG.WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update attendee in sheet');

  return attendee;
}