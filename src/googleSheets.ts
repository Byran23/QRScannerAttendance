// ============================================================
//  📊 GOOGLE SHEETS CONFIGURATION
//
//  To enable Google Sheets as your database:
//
//  1. Create a new Google Sheet
//  2. Create two sheets (tabs) named exactly:
//     - "Attendees"
//     - "Records"
//  3. In Attendees sheet, add headers in Row 1:
//     id | name | email | department | position | phone | createdAt
//  4. In Records sheet, add headers in Row 1:
//     id | attendeeId | attendeeName | attendeeEmail | attendeeDepartment | timestamp | type
//  5. Go to Extensions → Apps Script
//  6. Delete any code there and paste the script from GOOGLE_APPS_SCRIPT.js
//  7. Click Deploy → New deployment → Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  8. Copy the Web App URL and paste it below
//
//  If the URL is empty, the app uses localStorage (single-device).
// ============================================================

export const GOOGLE_SHEETS_CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here:
  WEB_APP_URL: '',
  
  // Example:
  // WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbw.../exec',
};

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    GOOGLE_SHEETS_CONFIG.WEB_APP_URL &&
    GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com')
  );
}
