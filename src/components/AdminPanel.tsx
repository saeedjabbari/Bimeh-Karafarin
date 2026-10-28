import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MedicalCenterReport, ReportStatus, ReportReason } from '../types';
import { formatPersianDate, toFa } from '../utils/persian';
import {
  getSheetsWebhookUrl,
  setSheetsWebhookUrl,
  fetchReportsFromSheets,
  GOOGLE_APPS_SCRIPT_CODE,
} from '../lib/sheets';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  LogOut,
  ArrowRight,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Layers,
  List,
  Building2,
  AlertCircle,
  Settings,
  Link,
  ExternalLink,
  Code2,
} from 'lucide-react';

const ADMIN_STORAGE_KEY = 'krf_admin_logged_in';
const ADMIN_PASS_KEY = 'krf_admin_pass';
const DEFAULT_PASSWORD = 'A$m@#73';
const DEFAULT_USERNAME = 'admin';

interface AdminPanelProps {
  onBackToApp: () => void;
  showToast: (msg: string) => void;
}

const REASON_LABELS: Record<ReportReason, string> = {
  phone: 'تلفن تماس',
  address: 'نشانی و آدرس',
  contract: 'قرارداد بیمه',
  timing: 'ساعات کاری / شبانه‌روزی',
  other: 'سایر موارد',
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  pending: {
    label: 'در انتظار بررسی',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
  },
  verified: {
    label: 'تأیید شده',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: CheckCircle,
  },
  applied: {
    label: 'اصلاح شد در برنامه',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'رد شده / نامعتبر',
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    icon: XCircle,
  },
};

export interface GroupedCenterReports {
  centerId: number;
  centerName: string;
  centerType: string;
  reportCount: number;
  reasonsSummary: Record<string, number>;
  latestReportDate: string;
  pendingCount: number;
  reports: MedicalCenterReport[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToApp,
  showToast,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password & Settings Modals
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [newPassInput, setNewPassInput] = useState('');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [sheetsUrlInput, setSheetsUrlInput] = useState<string>(() => getSheetsWebhookUrl());
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTestingSheets, setIsTestingSheets] = useState(false);

  // Data states
  const [reports, setReports] = useState<MedicalCenterReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSyncSource, setActiveSyncSource] = useState<'sheets' | 'firestore' | 'local'>('local');

  // View modes: 'grouped' (تجمیع بر اساس مرکز) or 'detailed' (تک‌تک سطرها)
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [expandedCenterId, setExpandedCenterId] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [copiedForSheets, setCopiedForSheets] = useState(false);

  // Universal fetch combining Google Sheets + Firestore
  const fetchAllReports = useCallback(
    async (showFeedback = false) => {
      setIsRefreshing(true);
      let loaded: MedicalCenterReport[] = [];
      let source: 'sheets' | 'firestore' | 'local' = 'local';

      // 1. Try Google Sheets Webhook first (works 100% in Iran across all ISPs and devices)
      let sheetsQueried = false;
      const webhookUrl = getSheetsWebhookUrl();
      if (webhookUrl) {
        try {
          const sheetsReports = await fetchReportsFromSheets();
          sheetsQueried = true;
          source = 'sheets';
          if (sheetsReports && sheetsReports.length > 0) {
            loaded = [...sheetsReports];
          }
        } catch (e) {
          console.warn('Sheets fetch warning:', e);
        }
      }

      // 2. Also try Firestore and merge if available
      try {
        const reportsRef = collection(db, 'reports');
        let snap;
        try {
          const q = query(reportsRef, orderBy('createdAt', 'desc'));
          snap = await getDocs(q);
        } catch {
          snap = await getDocs(reportsRef);
        }

        const firestoreList: MedicalCenterReport[] = [];
        snap.forEach((d) => {
          firestoreList.push({ ...(d.data() as MedicalCenterReport), id: d.id });
        });

        if (firestoreList.length > 0) {
          if (loaded.length === 0 && !sheetsQueried) {
            loaded = firestoreList;
            source = 'firestore';
          } else {
            // Merge unique reports from Firestore
            const existingKeys = new Set(
              loaded.map((r) => `${r.centerId}_${r.reason}_${r.createdAt.slice(0, 16)}`)
            );
            for (const fr of firestoreList) {
              const k = `${fr.centerId}_${fr.reason}_${(fr.createdAt || '').slice(0, 16)}`;
              if (!existingKeys.has(k)) {
                loaded.push(fr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Firestore fetch notice:', err);
      }

      // 3. Fallback to local storage only if remote sources were unreachable
      if (loaded.length === 0 && !sheetsQueried) {
        try {
          const localStored = JSON.parse(localStorage.getItem('krf_reports') || '[]');
          if (localStored.length > 0) {
            loaded = localStored.map((r: any, idx: number) => ({
              id: `local-${idx}`,
              centerId: Number(r.k || r.centerId || 1),
              centerName: r.centerName || `مرکز کد ${r.k || r.centerId}`,
              centerType: r.centerType || 'مرکز درمانی',
              reason: r.reason || 'other',
              reasonLabel: r.reasonLabel || REASON_LABELS[r.reason as ReportReason] || 'سایر',
              details: r.details || '',
              reporterContact: r.reporterContact || '',
              status: r.status || 'pending',
              createdAt: r.timestamp || r.createdAt || new Date().toISOString(),
            }));
            source = 'local';
          }
        } catch {}
      }

      // Sort descending by date
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setReports(loaded);
      setActiveSyncSource(source);
      setIsRefreshing(false);
      setIsLoading(false);

      if (showFeedback) {
        const sourceLabel =
          source === 'sheets'
            ? 'گوگل شیت (Google Sheets)'
            : source === 'firestore'
            ? 'سرور ابری فایربیس'
            : 'حافظه محلی';
        showToast(`همگام‌سازی از ${sourceLabel} انجام شد (${toFa(loaded.length)} گزارش)`);
      }
    },
    [showToast]
  );

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAllReports(false);

    // Optional firestore live listener
    try {
      const reportsRef = collection(db, 'reports');
      const unsubscribe = onSnapshot(
        reportsRef,
        () => {
          fetchAllReports(false);
        },
        () => {}
      );
      return () => unsubscribe();
    } catch {}
  }, [isAuthenticated, fetchAllReports]);

  // Handle Username/Password Login
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const rawPass = localStorage.getItem(ADMIN_PASS_KEY);
    const savedPass = rawPass && rawPass !== 'karafarin1403' ? rawPass : DEFAULT_PASSWORD;

    const user = usernameInput.trim().toLowerCase();
    const isValidUser = user === DEFAULT_USERNAME || user === 'saeed' || user === '';

    if (isValidUser && passwordInput === savedPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      showToast('ورود با موفقیت انجام شد');
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    showToast('از پنل مدیریت خارج شدید');
  };

  const handleChangePassword = () => {
    if (!newPassInput || newPassInput.length < 4) {
      showToast('رمز عبور باید حداقل ۴ نویسه باشد');
      return;
    }
    localStorage.setItem(ADMIN_PASS_KEY, newPassInput);
    setIsChangePassOpen(false);
    setNewPassInput('');
    showToast('رمز عبور ادمین با موفقیت تغییر کرد');
  };

  const handleSaveSheetsUrl = () => {
    setSheetsWebhookUrl(sheetsUrlInput.trim());
    showToast('آدرس وب‌هوک گوگل شیت ذخیره شد');
    fetchAllReports(true);
    setIsSheetsModalOpen(false);
  };

  const handleTestSheetsConnection = async () => {
    if (!sheetsUrlInput.trim()) {
      showToast('لطفاً ابتدا لینک وب‌هوک را وارد فرمایید');
      return;
    }
    setIsTestingSheets(true);
    setSheetsWebhookUrl(sheetsUrlInput.trim());
    try {
      const res = await fetchReportsFromSheets();
      showToast(`اتصال برقرار شد! ${toFa(res.length)} گزارش از Google Sheets دریافت شد.`);
      fetchAllReports(false);
    } catch (err: any) {
      showToast('خطا در اتصال به وب‌هوک گوگل شیت. بررسی فرمایید که دسترسی روی Anyone باشد.');
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
      setCopiedCode(true);
      showToast('کد اسکریپت گوگل شیت با موفقیت کپی شد');
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  // Status changer for individual report
  const handleUpdateStatus = async (reportId: string | undefined, newStatus: ReportStatus) => {
    if (!reportId) return;

    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
    showToast(`وضعیت به «${STATUS_CONFIG[newStatus].label}» تغییر یافت`);

    try {
      if (!reportId.startsWith('local-') && !reportId.startsWith('sheets-')) {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Status update notice:', err);
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string | undefined) => {
    if (!reportId) return;
    if (!window.confirm('آیا از حذف این گزارش مطمئن هستید؟')) return;

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    showToast('گزارش حذف شد');

    try {
      if (!reportId.startsWith('local-') && !reportId.startsWith('sheets-')) {
        await deleteDoc(doc(db, 'reports', reportId));
      }
    } catch (err) {
      console.warn('Delete notice:', err);
    }
  };

  // Filtered raw reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.centerName?.toLowerCase().includes(q);
        const matchDetails = r.details?.toLowerCase().includes(q);
        const matchContact = r.reporterContact?.toLowerCase().includes(q);
        const matchType = r.centerType?.toLowerCase().includes(q);
        if (!matchName && !matchDetails && !matchContact && !matchType) return false;
      }
      return true;
    });
  }, [reports, statusFilter, reasonFilter, searchQuery]);

  // Grouped by Center (جلوگیری از تکرار نام مراکز در سطرها)
  const groupedCenters = useMemo(() => {
    const map = new Map<number, GroupedCenterReports>();

    for (const r of filteredReports) {
      const cId = r.centerId || 0;
      if (!map.has(cId)) {
        map.set(cId, {
          centerId: cId,
          centerName: r.centerName,
          centerType: r.centerType || 'مرکز درمانی',
          reportCount: 0,
          reasonsSummary: {},
          latestReportDate: r.createdAt,
          pendingCount: 0,
          reports: [],
        });
      }

      const item = map.get(cId)!;
      item.reportCount += 1;
      item.reports.push(r);

      const rLabel = r.reasonLabel || REASON_LABELS[r.reason] || r.reason;
      item.reasonsSummary[rLabel] = (item.reasonsSummary[rLabel] || 0) + 1;

      if (r.status === 'pending') {
        item.pendingCount += 1;
      }

      if (new Date(r.createdAt).getTime() > new Date(item.latestReportDate).getTime()) {
        item.latestReportDate = r.createdAt;
      }
    }

    // Sort by reportCount desc (مراکزی که بیشترین گزارش دارند در صدر لیست)
    return Array.from(map.values()).sort(
      (a, b) => b.reportCount - a.reportCount || b.pendingCount - a.pendingCount
    );
  }, [filteredReports]);

  // Status counts
  const counts = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      verified: reports.filter((r) => r.status === 'verified').length,
      applied: reports.filter((r) => r.status === 'applied').length,
      uniqueCenters: new Set(reports.map((r) => r.centerId)).size,
    };
  }, [reports]);

  // Export Grouped Centers to CSV (یک سطر برای هر مرکز با ستون تعداد گزارش)
  const handleExportGroupedCSV = () => {
    if (groupedCenters.length === 0) {
      showToast('گزارشی برای خروجی وجود ندارد');
      return;
    }

    const headers = [
      'ردیف',
      'کد مرکز',
      'نام مرکز درمانی',
      'دسته‌بندی',
      'تعداد کل گزارش‌های ثبت‌شده',
      'گزارش‌های در انتظار بررسی',
      'خلاصه موضوعات گزارش',
      'تاریخ آخرین گزارش',
    ];

    const rows = groupedCenters.map((g, index) => {
      const reasonsStr = Object.entries(g.reasonsSummary)
        .map(([k, v]) => `${k} (${v} مورد)`)
        .join(' - ');

      return [
        String(index + 1),
        String(g.centerId || ''),
        `"${(g.centerName || '').replace(/"/g, '""')}"`,
        `"${(g.centerType || '').replace(/"/g, '""')}"`,
        String(g.reportCount),
        String(g.pendingCount),
        `"${reasonsStr.replace(/"/g, '""')}"`,
        `"${formatPersianDate(g.latestReportDate)}"`,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `marakez_por_gozaresh_karafarin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('فایل اکسل تجمیعی مراکز دانلود شد');
  };

  // Copy structured TSV for Google Sheets
  const handleCopyForGoogleSheets = () => {
    if (groupedCenters.length === 0) {
      showToast('گزارشی برای کپی وجود ندارد');
      return;
    }

    const headers = [
      'ردیف',
      'کد مرکز',
      'نام مرکز درمانی',
      'دسته‌بندی',
      'تعداد گزارش',
      'در انتظار',
      'موضوعات',
      'تاریخ آخرین گزارش',
    ];

    const rows = groupedCenters.map((g, i) => [
      i + 1,
      g.centerId,
      g.centerName,
      g.centerType,
      g.reportCount,
      g.pendingCount,
      Object.entries(g.reasonsSummary).map(([k, v]) => `${k}: ${v}`).join(' | '),
      formatPersianDate(g.latestReportDate),
    ]);

    const tsvText = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    navigator.clipboard.writeText(tsvText).then(() => {
      setCopiedForSheets(true);
      showToast('جدول تجمیعی کپی شد! می‌توانید مستقیماً در Google Sheets پیست کنید');
      setTimeout(() => setCopiedForSheets(false), 2500);
    });
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-[#0a4c9a] to-[#1e61b7] p-6 text-white text-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
              <ShieldCheck className="w-8 h-8 text-amber-300" />
            </div>
            <h1 className="text-base font-extrabold">پنل مدیریت گزارش‌های مراکز</h1>
            <p className="text-xs text-blue-100/90 mt-1">
              بیمه کارآفرین • سرپرستی و شعب استان آذربایجان غربی (ارومیه)
            </p>
          </div>

          <div className="p-6">
            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1">
                  نام کاربری:
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="نام کاربری..."
                  dir="ltr"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1">
                  رمز عبور:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="رمز عبور..."
                    dir="ltr"
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                <span>ورود به پنل مدیریت</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 mt-5 text-center">
              <button
                onClick={onBackToApp}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت به برنامه اصلی</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0a4c9a] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900">
                مدیریت گزارش‌های تغییر مشخصات مراکز
              </h1>
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                {isRefreshing ? (
                  <span className="text-[#0a4c9a] flex items-center gap-1.5 font-bold">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#0a4c9a]" />
                    <span>در حال دریافت تازه‌ترین گزارش‌ها از گوگل شیت...</span>
                  </span>
                ) : activeSyncSource === 'sheets' ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    متصل به Google Sheets (همگام‌سازی زنده بین تمام دستگاه‌ها)
                  </span>
                ) : activeSyncSource === 'firestore' ? (
                  <span className="text-blue-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    متصل به سرور ابری ({toFa(reports.length)} گزارش فعال)
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    برای همگام‌سازی بین گوشی و سیستم، روی «اتصال به Google Sheets» کلیک کنید
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              title="تنظیمات اتصال Google Sheets"
              className="py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">اتصال به Google Sheets</span>
            </button>

            <button
              onClick={() => fetchAllReports(true)}
              disabled={isRefreshing}
              title="همگام‌سازی و دریافت مجدد گزارش‌ها"
              className="p-2 rounded-xl text-[#0a4c9a] hover:bg-blue-50 border border-blue-200 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsChangePassOpen(true)}
              title="تغییر رمز عبور"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              title="خروج از حساب"
              className="p-2 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              onClick={onBackToApp}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بازگشت به برنامه</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Google Sheets Setup Callout Banner if not connected */}
        {!getSheetsWebhookUrl() && (
          <div className="bg-gradient-to-r from-emerald-500 to-[#0a4c9a] text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-sm">
                <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                <span>راهکار تجمیع همزمان تمام گوشی‌ها و کامپیوترها: اتصال به Google Sheets</span>
              </div>
              <p className="text-xs text-blue-100/90 leading-relaxed max-w-2xl">
                با اتصال برنامه به یک فایل رایگان Google Sheets در اکانت گوگل خود، گزارش‌های ارسالی از تمام دستگاه‌ها (موبایل، کروم، اج و هر آی‌پی) بدون تحریم و بدون فیلتر در یک جدول مرکزی ثبت و همگام‌سازی می‌شوند.
              </p>
            </div>
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="shrink-0 bg-white text-emerald-800 hover:bg-emerald-50 py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              تنظیم در ۲ دقیقه (کد آماده)
            </button>
          </div>
        )}

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>مراکز دارای گزارش</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {toFa(counts.uniqueCenters)} <span className="text-xs font-normal text-slate-400">مرکز</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>مجموع کل گزارش‌ها</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {toFa(counts.total)} <span className="text-xs font-normal text-slate-400">گزارش</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
            <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
              <span>در انتظار بررسی</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-700 tabular-nums">
              {toFa(counts.pending)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700 text-xs mb-1">
              <span>اصلاح شده در برنامه</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 tabular-nums">
              {toFa(counts.applied)}
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Export Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grouped')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#0a4c9a] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تجمیع بر اساس مرکز درمانی (ستون تعداد گزارش)</span>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'detailed'
                  ? 'bg-white text-[#0a4c9a] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>فهرست تک‌تک گزارش‌ها</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportGroupedCSV}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل تجمیعی (CSV)</span>
            </button>

            <button
              onClick={handleCopyForGoogleSheets}
              className="py-2.5 px-3.5 rounded-xl border border-slate-300 hover:border-[#0a4c9a] hover:bg-blue-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
            >
              {copiedForSheets ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">کپی شد! پیست در Google Sheets</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>کپی برای Google Sheets</span>
                </>
              )}
            </button>

            <button
              onClick={() => fetchAllReports(true)}
              disabled={isRefreshing}
              className="py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0a4c9a] text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>همگام‌سازی زنده</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام مرکز، شماره یا توضیحات..."
                className="w-full h-10 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار بررسی</option>
                <option value="verified">تأیید شده</option>
                <option value="applied">اصلاح شده</option>
                <option value="rejected">رد شده</option>
              </select>
            </div>

            {/* Reason Filter */}
            <div>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
              >
                <option value="all">همه انواع مغایرت</option>
                <option value="phone">شماره تلفن</option>
                <option value="address">نشانی و آدرس</option>
                <option value="contract">قرارداد بیمه</option>
                <option value="timing">ساعات کاری</option>
                <option value="other">سایر موارد</option>
              </select>
            </div>
          </div>
        </div>

        {/* CONTENT SECTION */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0a4c9a] mx-auto mb-2" />
            <span>در حال دریافت گزارش‌ها...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">هنوز هیچ گزارشی ثبت نشده است</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              به محض اینکه کاربران در اپلیکیشن خطایی را برای یک مرکز گزارش کنند، در این جدول ظاهر خواهد شد.
            </p>
          </div>
        ) : viewMode === 'grouped' ? (
          /* ========================================================
             1. GROUPED VIEW (یک سطر برای هر مرکز + ستون تعداد گزارش)
             ======================================================== */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span className="font-bold">
                تعداد مراکز دارای مغایرت: <strong className="text-slate-900 tabular-nums">{toFa(groupedCenters.length)}</strong> مرکز
              </span>
              <span className="text-[11px] text-slate-400">مرتب‌شده بر اساس بیشترین گزارش‌های دریافتی</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">ردیف</th>
                      <th className="py-3 px-4">نام مرکز درمانی و نوع</th>
                      <th className="py-3 px-4 text-center">تعداد گزارش</th>
                      <th className="py-3 px-4">موضوعات گزارش‌شده</th>
                      <th className="py-3 px-4 text-center">وضعیت پیگیری</th>
                      <th className="py-3 px-4">آخرین گزارش</th>
                      <th className="py-3 px-4 w-28 text-center">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedCenters.map((group, idx) => {
                      const isExpanded = expandedCenterId === group.centerId;
                      return (
                        <React.Fragment key={group.centerId}>
                          <tr className={`hover:bg-slate-50/80 transition ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400 tabular-nums">
                              {toFa(idx + 1)}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-slate-900 text-sm">
                                {group.centerName}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>کد #{toFa(group.centerId)}</span>
                                <span>•</span>
                                <span>{group.centerType}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-[#0a4c9a] font-black text-xs tabular-nums border border-blue-200 shadow-2xs">
                                {toFa(group.reportCount)} گزارش
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(group.reasonsSummary).map(([rTitle, rQty]) => (
                                  <span
                                    key={rTitle}
                                    className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium"
                                  >
                                    {rTitle} <span className="text-[#0a4c9a] font-bold">({toFa(rQty)})</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {group.pendingCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>{toFa(group.pendingCount)} در انتظار بررسی</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>بررسی‌شده</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-500 tabular-nums">
                              {formatPersianDate(group.latestReportDate)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() =>
                                  setExpandedCenterId(isExpanded ? null : group.centerId)
                                }
                                className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#0a4c9a] hover:border-blue-300 font-bold text-xs inline-flex items-center gap-1 transition"
                              >
                                <span>{isExpanded ? 'بستن' : 'مشاهده'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Reports for this Center */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/70 p-4 border-y border-slate-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                      <AlertCircle className="w-4 h-4 text-[#0a4c9a]" />
                                      <span>
                                        ریز گزارش‌های ثبت‌شده برای «{group.centerName}» ({toFa(group.reports.length)} مورد):
                                      </span>
                                    </h4>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2.5">
                                    {group.reports.map((rep, rIndex) => {
                                      const statusCfg =
                                        STATUS_CONFIG[rep.status] || STATUS_CONFIG.pending;
                                      return (
                                        <div
                                          key={rep.id || rIndex}
                                          className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-extrabold text-[#0a4c9a] text-xs">
                                                گزارش #{toFa(rIndex + 1)}
                                              </span>
                                              <span className="text-slate-300">•</span>
                                              <span className="font-bold text-slate-700 text-xs">
                                                موضوع: {rep.reasonLabel || REASON_LABELS[rep.reason] || rep.reason}
                                              </span>
                                              <span className="text-slate-300">•</span>
                                              <span className="text-[11px] text-slate-400">
                                                {formatPersianDate(rep.createdAt)}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                                              >
                                                {statusCfg.label}
                                              </span>
                                              <button
                                                onClick={() => handleDeleteReport(rep.id)}
                                                className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                                                title="حذف این گزارش"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="text-xs text-slate-700 leading-relaxed">
                                            {rep.details ? (
                                              <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                {rep.details}
                                              </p>
                                            ) : (
                                              <span className="text-slate-400 italic text-[11px]">
                                                توضیحات متنی ثبت نشده است.
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                                            {rep.reporterContact ? (
                                              <div className="flex items-center gap-1.5 text-slate-600">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[11px]">تماس کاربر:</span>
                                                <a
                                                  href={`tel:${rep.reporterContact}`}
                                                  className="font-bold text-[#0a4c9a] dir-ltr text-xs"
                                                >
                                                  {rep.reporterContact}
                                                </a>
                                              </div>
                                            ) : (
                                              <span />
                                            )}

                                            <div className="flex items-center gap-1 text-[11px]">
                                              <span className="text-slate-400 ml-1">تغییر وضعیت:</span>
                                              <button
                                                onClick={() => handleUpdateStatus(rep.id, 'pending')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                  rep.status === 'pending'
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-white text-slate-600 border-slate-200'
                                                }`}
                                              >
                                                در انتظار
                                              </button>
                                              <button
                                                onClick={() => handleUpdateStatus(rep.id, 'verified')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                  rep.status === 'verified'
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-slate-600 border-slate-200'
                                                }`}
                                              >
                                                تأیید شد
                                              </button>
                                              <button
                                                onClick={() => handleUpdateStatus(rep.id, 'applied')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                  rep.status === 'applied'
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-slate-600 border-slate-200'
                                                }`}
                                              >
                                                اصلاح شد
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             2. DETAILED VIEW (سطر به سطر تمام گزارش‌ها)
             ======================================================== */
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition hover:border-[#0a4c9a]/40 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          کد #{toFa(report.centerId)}
                        </span>
                        <h3 className="text-sm font-black text-slate-900">
                          {report.centerName}
                        </h3>
                        {report.centerType && (
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {report.centerType}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>تاریخ ثبت: {formatPersianDate(report.createdAt)}</span>
                        <span>•</span>
                        <span className="font-bold text-[#0a4c9a]">
                          موضوع: {report.reasonLabel || REASON_LABELS[report.reason] || report.reason}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusCfg.label}</span>
                      </span>

                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        title="حذف گزارش"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {report.details ? (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[11px] font-bold mb-1">
                          توضیحات و مشخصات اعلام‌شده توسط کاربر:
                        </span>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                          {report.details}
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-[11px]">
                        توضیحات متنی اضافه ثبت نشده است.
                      </div>
                    )}

                    {report.reporterContact && (
                      <div className="flex items-center gap-2 text-slate-600 pt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px]">شماره تماس کاربر:</span>
                        <a
                          href={`tel:${report.reporterContact}`}
                          className="font-bold text-[#0a4c9a] hover:underline dir-ltr text-xs"
                        >
                          {report.reporterContact}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold">
                      تغییر وضعیت پیگیری:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'pending')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                          report.status === 'pending'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        در انتظار
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'verified')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                          report.status === 'verified'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        تأیید شد
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'applied')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                          report.status === 'applied'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        اصلاح شد در برنامه
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'rejected')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                          report.status === 'rejected'
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        رد شد
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Google Sheets Setup Modal */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsSheetsModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    اتصال به Google Sheets (همگام‌سازی دائمی و بدون تحریم)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    گزارش‌های کاربران مستقیماً در فایل اکسل آنلاین گوگل شما ثبت می‌شود
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Step by step guide */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 leading-relaxed">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#0a4c9a]" />
                <span>راهنمای ۳ مرحله‌ای راه‌اندازی (فقط ۲ دقیقه):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pr-1 text-[11.5px]">
                <li>
                  وارد اکانت گوگل خود شده و یک شیت خالی در{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0a4c9a] font-bold underline inline-flex items-center gap-0.5"
                  >
                    <span>sheets.new</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  ایجاد کنید.
                </li>
                <li>
                  از منوی بالای شیت، روی <strong>Extensions (برنامه‌های افزودنی)</strong> ⬅️{' '}
                  <strong>Apps Script</strong> کلیک کنید.
                </li>
                <li>
                  تمام کدهای پیش‌فرض را پاک کرده و <strong>کد آماده زیر</strong> را درون آن پیست (Ctrl+V) کنید:
                </li>
              </ol>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyScriptCode}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold flex items-center justify-center gap-2 transition shadow-xs text-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>کد اسکریپت کپی شد! در Apps Script پیست کنید</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>کپی کد آماده Google Apps Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <strong className="block text-slate-800">مرحله نهایی (Deploy):</strong>
                <span>
                  در بالای صفحه Apps Script، دکمه آبی <strong>Deploy</strong> ⬅️ <strong>New deployment</strong> را بزنید.
                  نوع آن را <strong>Web app</strong> بگذارید و در بخش Who has access حتماً گزینه{' '}
                  <strong className="text-emerald-700">Anyone (هر کسی)</strong> را انتخاب کنید. لینکی که به شما می‌دهد (URL) را کپی کرده و در کادر زیر قرار دهید:
                </span>
              </div>
            </div>

            {/* Input URL */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-slate-800 font-bold">
                آدرس وب‌هوک گوگل شیت (Web app URL):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={sheetsUrlInput}
                  onChange={(e) => setSheetsUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  dir="ltr"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600 text-left"
                />
                <Link className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestSheetsConnection}
                disabled={isTestingSheets}
                className="w-full sm:flex-1 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSheets ? 'animate-spin' : ''}`} />
                <span>{isTestingSheets ? 'در حال تست...' : 'تست زنده اتصال به شیت'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSheetsUrl}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>ذخیره و فعال‌سازی در برنامه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsChangePassOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl z-10 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0a4c9a]" />
              <span>تغییر رمز عبور ورود به پنل ادمین</span>
            </h3>
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1">
                رمز عبور جدید:
              </label>
              <input
                type="password"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="حداقل ۴ نویسه..."
                dir="ltr"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsChangePassOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                className="flex-1 py-2 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold text-xs"
              >
                ذخیره رمز جدید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
