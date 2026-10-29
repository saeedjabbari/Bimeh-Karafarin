import { MedicalCenterReport } from '../types';

export const SHEETS_STORAGE_KEY = 'krf_sheets_webhook_url';

// Default / fallback webhook URL (permanently connected to user's Google Sheet)
export const DEFAULT_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycby9pU0rPlBI8AKfXbkSJXodnBVY6PjVXUYHxfLZMynaIXoSNDci7ah4TimCfWZTgsN2cA/exec';

export function getSheetsWebhookUrl(): string {
  try {
    const custom = localStorage.getItem(SHEETS_STORAGE_KEY);
    if (custom && custom.trim().length > 15) {
      return custom.trim();
    }
    return DEFAULT_SHEETS_WEBHOOK_URL;
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
    const fetchUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(fetchUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

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
    console.warn('Error fetching reports from Google Sheets:', err);
    throw err;
  }
}

/**
 * Record user search to Google Sheets Webhook in a separate "جستجوهای کاربران" tab
 */
export interface SearchRecord {
  term: string;
  resultCount: number;
  selectedStreet?: string;
  selectedType?: string;
  clickedCenter?: string;
  createdAt?: string;
}

export const OFFLINE_SEARCH_QUEUE_KEY = 'krf_offline_search_queue';

/**
 * Enqueue a search record into localStorage when device is offline
 */
function enqueueOfflineSearch(search: SearchRecord): void {
  try {
    const raw = localStorage.getItem(OFFLINE_SEARCH_QUEUE_KEY);
    const queue: SearchRecord[] = raw ? JSON.parse(raw) : [];
    // Avoid duplicate rapid saves of identical term
    if (queue.length === 0 || queue[queue.length - 1].term !== search.term) {
      queue.push(search);
      // Keep queue bounded
      if (queue.length > 150) queue.shift();
      localStorage.setItem(OFFLINE_SEARCH_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
}

/**
 * Flush all pending offline searches to Google Sheets when back online
 */
export async function flushOfflineSearchQueue(): Promise<number> {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) return 0;

  let queue: SearchRecord[] = [];
  try {
    const raw = localStorage.getItem(OFFLINE_SEARCH_QUEUE_KEY);
    if (!raw) return 0;
    queue = JSON.parse(raw);
  } catch {
    return 0;
  }

  if (queue.length === 0) return 0;

  let flushedCount = 0;
  const remaining: SearchRecord[] = [];

  for (const item of queue) {
    try {
      const payload = {
        type: 'search',
        term: item.term,
        resultCount: item.resultCount,
        selectedStreet: item.selectedStreet || 'همه',
        selectedType: item.selectedType || 'همه',
        clickedCenter: item.clickedCenter || '',
        createdAt: item.createdAt || new Date().toISOString(),
      };

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      flushedCount++;
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      remaining.push(item);
    }
  }

  try {
    if (remaining.length > 0) {
      localStorage.setItem(OFFLINE_SEARCH_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OFFLINE_SEARCH_QUEUE_KEY);
    }
  } catch {}

  return flushedCount;
}

// Automatically flush queue whenever online event fires
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineSearchQueue().catch(() => {});
  });
}

export async function recordSearchToSheets(search: SearchRecord): Promise<boolean> {
  const webhookUrl = getSheetsWebhookUrl();
  const searchWithDate: SearchRecord = {
    ...search,
    createdAt: search.createdAt || new Date().toISOString(),
  };

  // If offline or no webhook, queue it locally
  if (!webhookUrl || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    enqueueOfflineSearch(searchWithDate);
    return true;
  }

  const payload = {
    type: 'search',
    term: searchWithDate.term,
    resultCount: searchWithDate.resultCount,
    selectedStreet: searchWithDate.selectedStreet || 'همه',
    selectedType: searchWithDate.selectedType || 'همه',
    clickedCenter: searchWithDate.clickedCenter || '',
    createdAt: searchWithDate.createdAt,
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
    // Background flush of any previous offline items
    flushOfflineSearchQueue().catch(() => {});
    return true;
  } catch (err) {
    console.warn('Network issue saving search to sheets; queued offline:', err);
    enqueueOfflineSearch(searchWithDate);
    return true;
  }
}

/**
 * Fetch all searches from Google Sheets Webhook via GET
 */
export async function fetchSearchesFromSheets(): Promise<SearchRecord[]> {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) return [];

  try {
    const fetchUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}type=searches&_t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(fetchUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data.searches || [];

    return list.map((item) => ({
      term: String(item['عبارت جستجو شده'] || item.term || ''),
      resultCount: Number(item['تعداد نتایج یافت‌شده'] || item['تعداد نتایج'] || item.resultCount || 0),
      selectedStreet: String(item['فیلتر خیابان'] || item.selectedStreet || 'همه'),
      selectedType: String(item['فیلتر دسته‌بندی'] || item.selectedType || 'همه'),
      clickedCenter: String(item['مرکز انتخاب‌شده'] || item.clickedCenter || ''),
      createdAt: String(item['تاریخ و زمان'] || item['تاریخ و ساعت'] || item.createdAt || ''),
    }));
  } catch (err) {
    console.warn('Error fetching searches from Google Sheets:', err);
    return [];
  }
}

/**
 * The exact Google Apps Script code template that admin can paste in their Google Sheet
 * Handles both:
 * 1) Medical Center Reports (Saved in 'گزارشات مراکز' sheet)
 * 2) User Searches for Marketing (Saved in 'جستجوهای کاربران' sheet)
 */
export const GOOGLE_APPS_SCRIPT_CODE = `// ========================================================
// اسکریپت جامع اتصال اپلیکیشن مراکز درمانی کارآفرین به Google Sheets
// شامل دو تب مجزا: ۱) گزارشات مراکز   ۲) جستجوهای کاربران (مارکتینگ)
// ========================================================

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    var item = JSON.parse(e.postData.contents);
    
    // الف) اگر داده از نوع ثبت جستجوی کاربر باشد
    if (item.type === 'search') {
      var searchSheet = ss.getSheetByName("جستجوهای کاربران");
      if (!searchSheet) {
        searchSheet = ss.insertSheet("جستجوهای کاربران");
      }
      
      // ساخت هدر در صورت خالی بودن شیت جستجوها
      if (searchSheet.getLastRow() === 0) {
        searchSheet.appendRow([
          'عبارت جستجو شده',
          'تعداد نتایج یافت‌شده',
          'مرکز انتخاب‌شده / اقدام',
          'فیلتر خیابان',
          'فیلتر دسته‌بندی',
          'تاریخ و زمان',
          'وضعیت تقاضا'
        ]);
        searchSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#fed7aa');
      }
      
      var demandStatus = (Number(item.resultCount) === 0) ? '❌ ناموجود (فرصت قرارداد)' : '✅ یافت شد';
      var tehranTime = Utilities.formatDate(new Date(), "Asia/Tehran", "yyyy/MM/dd HH:mm:ss");
      
      searchSheet.appendRow([
        item.term || '',
        item.resultCount !== undefined ? item.resultCount : 0,
        item.clickedCenter || '—',
        item.selectedStreet || 'همه',
        item.selectedType || 'همه',
        tehranTime,
        demandStatus
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, target: 'search' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ب) در غیر این صورت، گزارش مغایرت یا تغییر مشخصات مرکز است
    var repSheet = ss.getSheetByName("گزارشات مراکز") || ss.getSheets()[0];
    if (repSheet.getName() === "جستجوهای کاربران") {
      repSheet = ss.insertSheet("گزارشات مراکز");
    }
    
    // ساخت هدر در صورت خالی بودن شیت گزارشات
    if (repSheet.getLastRow() === 0) {
      repSheet.appendRow([
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
      repSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#e2e8f0');
    }
    
    repSheet.appendRow([
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
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, target: 'report' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var type = (e && e.parameter && e.parameter.type) ? e.parameter.type : 'reports';
  
  // بازگرداندن دیتای جستجوها
  if (type === 'searches') {
    var searchSheet = ss.getSheetByName("جستجوهای کاربران");
    if (!searchSheet || searchSheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ searches: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sData = searchSheet.getDataRange().getValues();
    var sHeaders = sData[0];
    var searches = [];
    for (var i = 1; i < sData.length; i++) {
      var sRow = sData[i];
      var sItem = {};
      for (var j = 0; j < sHeaders.length; j++) {
        sItem[sHeaders[j]] = sRow[j];
      }
      searches.push(sItem);
    }
    return ContentService.createTextOutput(JSON.stringify({ searches: searches }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // پیش‌فرض: بازگرداندن دیتای گزارشات مراکز
  var repSheet = ss.getSheetByName("گزارشات مراکز") || ss.getSheets()[0];
  if (!repSheet || repSheet.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ reports: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = repSheet.getDataRange().getValues();
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
`;
