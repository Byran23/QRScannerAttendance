/**
 * ============================================================
 * GOOGLE APPS SCRIPT - AttendEase API
 * ============================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire file
 * 5. Click "Deploy" → "New deployment"
 * 6. Select type: "Web app"
 * 7. Set "Execute as": Me (your account)
 * 8. Set "Who has access": Anyone
 * 9. Click "Deploy" and authorize when prompted
 * 10. Copy the Web App URL
 *
 * Your Google Sheet must have three sheets (tabs):
 * - "Attendees" with headers: id, name, email, department, position, phone, createdAt
 * - "Records" with headers: id, attendeeId, attendeeName, attendeeEmail, attendeeDepartment, timestamp, type
 * - "AdminPins" with headers: pin, label, active
 *   Example row: 1234 | Main Admin | TRUE
 *   Tip: format the pin column as Plain text to preserve leading zeros.
 */

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    })
    .filter(obj => obj.id && String(obj.id).trim() !== '');
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  const target = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === target) return i + 1;
  }
  return -1;
}

function findRecordRow(sheet, record) {
  if (!record) return -1;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const matches =
      String(row[0]).trim() === String(record.id || '').trim() ||
      (
        String(row[1]).trim() === String(record.attendeeId || '').trim() &&
        String(row[2]).trim() === String(record.attendeeName || '').trim() &&
        String(row[3]).trim() === String(record.attendeeEmail || '').trim() &&
        String(row[4]).trim() === String(record.attendeeDepartment || '').trim() &&
        String(row[5]).trim() === String(record.timestamp || '').trim() &&
        String(row[6]).trim() === String(record.type || '').trim()
      );
    if (matches) return i + 1;
  }
  return -1;
}

function replaceSheetRows(sheet, rows) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  if (!rows || rows.length === 0) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function getActivePins() {
  const sheet = getSheet('AdminPins');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const pinIdx = headers.indexOf('pin');
  const activeIdx = headers.indexOf('active');

  if (pinIdx === -1) return [];

  const pins = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const pinValue = String(row[pinIdx] || '').trim();
    if (!pinValue) continue;

    let isActive = true;
    if (activeIdx !== -1) {
      const raw = String(row[activeIdx]).trim().toLowerCase();
      isActive = raw === '' || raw === 'true' || raw === 'yes' || raw === '1';
    }

    if (isActive) {
      pins.push(pinValue);
    }
  }

  return pins;
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    let result = {};

    if (action === 'getAll') {
      const attendeesSheet = getSheet('Attendees');
      const recordsSheet = getSheet('Records');

      result = {
        success: true,
        attendees: attendeesSheet ? sheetToObjects(attendeesSheet) : [],
        records: recordsSheet ? sheetToObjects(recordsSheet) : [],
      };
    }

    else if (action === 'getPins') {
      result = {
        success: true,
        pins: getActivePins(),
      };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result = { success: true };

    // ─── ATTENDEES ───
    if (action === 'addAttendee') {
      const sheet = getSheet('Attendees');
      const attendee = data.attendee;
      sheet.appendRow([
        attendee.id,
        attendee.name,
        attendee.email,
        attendee.department,
        attendee.position,
        attendee.phone || '',
        attendee.createdAt,
      ]);
      result.attendee = attendee;
    }

    else if (action === 'updateAttendee') {
      const sheet = getSheet('Attendees');
      const attendee = data.attendee;
      const rowIndex = findRowById(sheet, attendee.id);

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, 7).setValues([[
          attendee.id,
          attendee.name,
          attendee.email,
          attendee.department,
          attendee.position,
          attendee.phone || '',
          attendee.createdAt,
        ]]);
        result.attendee = attendee;
      } else {
        result.success = false;
        result.error = 'Attendee not found';
      }
    }

    else if (action === 'deleteAttendee') {
      const sheet = getSheet('Attendees');
      const rowIndex = findRowById(sheet, data.id);

      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
      } else {
        result.success = false;
        result.error = 'Attendee not found';
      }
    }

    // ─── RECORDS ───
    else if (action === 'replaceRecords') {
      const sheet = getSheet('Records');
      const records = data.records || [];
      const rows = records.map(record => [
        record.id,
        record.attendeeId,
        record.attendeeName,
        record.attendeeEmail,
        record.attendeeDepartment,
        record.timestamp,
        record.type,
      ]);
      replaceSheetRows(sheet, rows);
    }

    else if (action === 'deleteRecord') {
      const sheet = getSheet('Records');
      let rowIndex = findRowById(sheet, data.id);
      if (rowIndex <= 0) {
        rowIndex = findRecordRow(sheet, data.record);
      }

      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
        SpreadsheetApp.flush();
        result.deletedId = data.id;
      } else {
        result.success = false;
        result.error = 'Record not found';
      }
    }

    else if (action === 'addRecord') {
      const sheet = getSheet('Records');
      const record = data.record;
      sheet.appendRow([
        record.id,
        record.attendeeId,
        record.attendeeName,
        record.attendeeEmail,
        record.attendeeDepartment,
        record.timestamp,
        record.type,
      ]);
      result.record = record;
    }

    else if (action === 'clearRecords') {
      const sheet = getSheet('Records');
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
