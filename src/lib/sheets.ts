import { MedicalCenterReport } from '../types';

export const SHEETS_STORAGE_KEY = 'krf_sheets_webhook_url';

// Default / fallback webhook URL (can be customized by admin inside /admin panel)
export const DEFAULT_SHEETS_WEBHOOK_URL = '';

export function getSheetsWebhookUrl(): string {
  try {
    return localStorage.getItem(SHEETS_STORAGE_KEY) || DEFAULT_SHEETS_WEBHOOK_URL;
  } catch {
    return DEFAULT_SHEETS_WEBHOOK_URL;
  }
}

export function setSheetsWebhookUrl(url: string): void {
  try {
    localStorage.setItem(SHEETS_STORAGE_KEY, url.trim());
  } catch {}
}

/**
 * Submit report to Google Sheets Webhook.
 * Uses mode: 'no-cors' to avoid browser cross-origin redirects from script.google.com
 */
export async function submitReportToSheets(report: MedicalCenterReport): Promise<boolean> {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) {
    console.warn('Google Sheets Webhook URL not configured yet.');
    return false;
  }

  const payload = {
    centerId: report.centerId,
    centerName: report.centerName,
    centerType: report.centerType || 'مرکز درمانی',
    reason: report.reason,
    reasonLabel: report.reasonLabel || report.reason,
    details: report.details || '',
    reporterContact: report.reporterContact || '',
    status: report.status || 'pending',
    createdAt: report.createdAt || new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error('Error posting to Google Sheets webhook:', err);
    return false;
  }
}

/**
 * Fetch all reports from Google Sheets Webhook via GET
 */
export async function fetchReportsFromSheets(): Promise<MedicalCenterReport[]> {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) return [];

  try {
    const res = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data.reports || [];

    return list.map((item, idx) => ({
      id: item.id || `sheets-${idx}`,
      centerId: Number(item.centerId || 1),
      centerName: String(item.centerName || 'مرکز درمانی'),
      centerType: String(item.centerType || 'مرکز درمانی'),
      reason: item.reason || 'other',
      reasonLabel: item.reasonLabel || item.reason || 'سایر',
      details: String(item.details || ''),
      reporterContact: String(item.reporterContact || ''),
      status: item.status || 'pending',
      createdAt: item.createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error fetching reports from Google Sheets:', err);
    throw err;
  }
}

/**
 * The exact Google Apps Script code template that admin can paste in their Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `// ========================================================
// اسکریپت اتصال اپلیکیشن بیمه کارآفرین به Google Sheets
// ========================================================

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ reports: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var reports = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rep = {};
    for (var j = 0; j < headers.length; j++) {
      rep[headers[j]] = row[j];
    }
    reports.push(rep);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ reports: reports }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // اگر شیت خالی است، ردیف عنوان‌ها را بساز
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'centerId',
      'centerName',
      'centerType',
      'reason',
      'reasonLabel',
      'details',
      'reporterContact',
      'status',
      'createdAt'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f3f4f6');
  }
  
  try {
    var item = JSON.parse(e.postData.contents);
    sheet.appendRow([
      item.centerId || '',
      item.centerName || '',
      item.centerType || '',
      item.reason || '',
      item.reasonLabel || '',
      item.details || '',
      item.reporterContact || '',
      item.status || 'pending',
      item.createdAt || new Date().toISOString()
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
