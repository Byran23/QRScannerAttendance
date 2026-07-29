/**
 * ============================================================
 * GOOGLE APPS SCRIPT - AttendEase API
 * ============================================================
 *
 * Your Google Sheet must have three sheets (tabs):
 * - "Attendees" (11 columns: id, name, email, department, position, phone, createdAt, willAttend, reason, group, tableNo)
 * - "Records" (7 columns: id, attendeeId, attendeeName, attendeeEmail, attendeeDepartment, timestamp, type)
 * - "AdminPins" (pin, label, active, ..., Col J: Event Title, Col K: Header Image URL, Col L: Form Fields Config)
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

// Fetch Event Title (Col J2), Header Image URL (Col K2), and Form Fields JSON (Col L2) from AdminPins tab
function getEventConfig(sheet) {
  const defaultFields = {
    departmentRequired: true,
    positionRequired: true,
    phoneRequired: true,
    emailRequired: false
  };

  try {
    const title = sheet.getRange("J2").getValue() || "";
    const imageUrl = sheet.getRange("K2").getValue() || "";
    const formFieldsRaw = sheet.getRange("L2").getValue() || "";

    let formFields = defaultFields;
    if (formFieldsRaw) {
      try {
        formFields = typeof formFieldsRaw === 'string' ? JSON.parse(formFieldsRaw) : formFieldsRaw;
      } catch (e) {
        formFields = defaultFields;
      }
    }

    return { 
      title: String(title), 
      imageUrl: String(imageUrl),
      formFields: formFields
    };
  } catch (e) {
    return { title: "", imageUrl: "", formFields: defaultFields };
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    let result = {};

    if (action === 'getAll') {
      const attendeesSheet = getSheet('Attendees');
      const recordsSheet = getSheet('Records');
      const adminPinsSheet = getSheet('AdminPins');

      result = {
        success: true,
        attendees: attendeesSheet ? sheetToObjects(attendeesSheet) : [],
        records: recordsSheet ? sheetToObjects(recordsSheet) : [],
        eventConfig: adminPinsSheet ? getEventConfig(adminPinsSheet) : { title: '', imageUrl: '', formFields: {} },
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

    // ─── EVENT CONFIG ───
    if (action === 'updateEventConfig') {
      const sheet = getSheet('AdminPins');
      const config = data.eventConfig || {};

      sheet.getRange("J2").setValue(config.title || "");
      sheet.getRange("K2").setValue(config.imageUrl || "");
      
      // Save form field requirements as JSON string into Column L2
      if (config.formFields) {
        sheet.getRange("L2").setValue(JSON.stringify(config.formFields));
      }

      result.eventConfig = config;
    }

    // ─── ATTENDEES ───
    else if (action === 'addAttendee') {
      const sheet = getSheet('Attendees');
      const attendee = data.attendee;

      const isAttending = attendee.willAttend === true || attendee.willAttend === 'yes' || attendee.willAttend === 'true';
      const attendanceStatus = isAttending ? 'Will Attend' : 'Will Not Attend';
      const attendanceReason = !isAttending ? (attendee.reason || '') : '';

      sheet.appendRow([
        attendee.id,
        attendee.name,
        attendee.email,
        attendee.department,
        attendee.position,
        attendee.phone || '',
        attendee.createdAt,
        attendanceStatus,       // Column H
        attendanceReason,       // Column I
        attendee.group || '',   // Column J
        attendee.tableNo || '', // Column K
      ]);

      result.attendee = attendee;
    }

    else if (action === 'updateAttendee') {
      const sheet = getSheet('Attendees');
      const attendee = data.attendee;
      const rowIndex = findRowById(sheet, attendee.id);

      if (rowIndex > 0) {
        const isAttending = attendee.willAttend === true || attendee.willAttend === 'yes' || attendee.willAttend === 'true';
        const attendanceStatus = isAttending ? 'Will Attend' : 'Will Not Attend';
        const attendanceReason = !isAttending ? (attendee.reason || '') : '';

        // Set 11 columns (A to K)
        sheet.getRange(rowIndex, 1, 1, 11).setValues([[
          attendee.id,
          attendee.name,
          attendee.email,
          attendee.department,
          attendee.position,
          attendee.phone || '',
          attendee.createdAt,
          attendanceStatus,       // Column H
          attendanceReason,       // Column I
          attendee.group || '',   // Column J
          attendee.tableNo || '', // Column K
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
        result.deletedId = data.id;
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