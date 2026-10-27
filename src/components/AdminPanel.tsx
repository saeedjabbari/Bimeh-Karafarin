import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { MedicalCenterReport, ReportStatus, ReportReason } from '../types';
import { formatPersianDate, toFa } from '../utils/persian';
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
  Filter,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

const ADMIN_STORAGE_KEY = 'krf_admin_logged_in';
const ADMIN_PASS_KEY = 'krf_admin_pass';
const DEFAULT_PASSWORD = 'karafarin1403';
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
    label: 'اصلاح شد در اطلاعات',
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

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToApp,
  showToast,
}) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Password management modal
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [newPassInput, setNewPassInput] = useState('');

  // Data states
  const [reports, setReports] = useState<MedicalCenterReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [copiedForSheets, setCopiedForSheets] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === 'saeedjabbari21@gmail.com') {
        setIsAuthenticated(true);
        sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports in real-time when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    setErrorMsg(null);

    // 1. Immediately read local storage reports so admin sees data instantly
    try {
      const localReports = JSON.parse(localStorage.getItem('krf_reports') || '[]');
      if (localReports.length > 0) {
        setReports(
          localReports.map((r: any, idx: number) => ({
            id: `local-${idx}`,
            centerId: r.k || r.centerId,
            centerName: r.centerName || `مرکز کد ${r.k || r.centerId}`,
            centerType: r.centerType || 'مرکز درمانی',
            reason: r.reason || 'other',
            reasonLabel: r.reasonLabel || REASON_LABELS[r.reason as ReportReason] || 'سایر',
            details: r.details || '',
            reporterContact: r.reporterContact || '',
            status: r.status || 'pending',
            createdAt: r.timestamp || r.createdAt || new Date().toISOString(),
          }))
        );
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } catch {
      setIsLoading(true);
    }

    // Safety timeout: if Firestore takes > 3.5s due to connection or proxy, don't leave spinner forever
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    // 2. Connect to Firestore cloud stream
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timer);
        const loaded: MedicalCenterReport[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as MedicalCenterReport;
          loaded.push({
            ...data,
            id: d.id,
          });
        });
        if (loaded.length > 0) {
          setReports(loaded);
        }
        setIsLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        console.warn('Firestore snapshot note:', err);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isAuthenticated]);

  // Handle Username/Password Login
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const savedPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

    if (
      usernameInput.trim().toLowerCase() === DEFAULT_USERNAME &&
      passwordInput === savedPass
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      showToast('ورود با موفقیت انجام شد');
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است');
    }
  };

  // Handle Google Auth
  const handleGoogleLogin = async () => {
    setIsGoogleSigningIn(true);
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        setIsAuthenticated(true);
        sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
        showToast(`خوش آمدید ${res.user.displayName || res.user.email}`);
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setLoginError('خطا در ورود با گوگل: ' + (err.message || 'ناموفق'));
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
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

  // Status changer
  const handleUpdateStatus = async (reportId: string | undefined, newStatus: ReportStatus) => {
    if (!reportId) return;

    try {
      if (reportId.startsWith('local-')) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
        showToast(`وضعیت به «${STATUS_CONFIG[newStatus].label}» تغییر یافت`);
        return;
      }

      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(`وضعیت به «${STATUS_CONFIG[newStatus].label}» به‌روز شد`);
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('خطا در ذخیره تغییر وضعیت در سرور ابری');
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string | undefined) => {
    if (!reportId) return;
    if (!window.confirm('آیا از حذف این گزارش مطمئن هستید؟')) return;

    try {
      if (reportId.startsWith('local-')) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        showToast('گزارش حذف شد');
        return;
      }

      await deleteDoc(doc(db, 'reports', reportId));
      showToast('گزارش از سرور ابری حذف شد');
    } catch (err) {
      console.error('Error deleting report:', err);
      showToast('خطا در حذف گزارش از سرور ابری');
    }
  };

  // Export to Excel (CSV with UTF-8 BOM for Persian)
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      showToast('هیچ گزارشی برای خروجی وجود ندارد');
      return;
    }

    const headers = [
      'شناسه گزارش',
      'کد مرکز',
      'نام مرکز درمانی',
      'دسته‌بندی',
      'موضوع گزارش',
      'توضیحات و مشخصات جدید',
      'شماره تماس گزارش‌دهنده',
      'وضعیت بررسی',
      'تاریخ و ساعت ثبت',
    ];

    const rows = filteredReports.map((r, index) => [
      String(index + 1),
      String(r.centerId || ''),
      `"${(r.centerName || '').replace(/"/g, '""')}"`,
      `"${(r.centerType || '').replace(/"/g, '""')}"`,
      `"${(r.reasonLabel || REASON_LABELS[r.reason] || r.reason).replace(/"/g, '""')}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${(r.reporterContact || '').replace(/"/g, '""')}"`,
      `"${STATUS_CONFIG[r.status]?.label || r.status}"`,
      `"${formatPersianDate(r.createdAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `gozaresh_marakez_karafarin_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('فایل اکسل با موفقیت دانلود شد');
  };

  // Copy structured TSV for direct paste into Google Sheets
  const handleCopyForGoogleSheets = () => {
    if (filteredReports.length === 0) {
      showToast('گزارشی برای کپی وجود ندارد');
      return;
    }

    const headers = [
      'ردیف',
      'کد مرکز',
      'نام مرکز درمانی',
      'دسته‌بندی',
      'نوع مغایرت',
      'توضیحات تکمیلی',
      'شماره گزارش‌دهنده',
      'وضعیت',
      'تاریخ ثبت',
    ];

    const rows = filteredReports.map((r, i) => [
      i + 1,
      r.centerId || '',
      r.centerName || '',
      r.centerType || '',
      r.reasonLabel || REASON_LABELS[r.reason] || r.reason,
      (r.details || '').replace(/\n/g, ' '),
      r.reporterContact || '',
      STATUS_CONFIG[r.status]?.label || r.status,
      formatPersianDate(r.createdAt),
    ]);

    const tsvText = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    navigator.clipboard.writeText(tsvText).then(() => {
      setCopiedForSheets(true);
      showToast('داده‌ها کپی شد! می‌توانید مستقیماً در Google Sheets پیست (Ctrl+V) کنید');
      setTimeout(() => setCopiedForSheets(false), 2500);
    });
  };

  // Filtered reports
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

  // Status counts
  const counts = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      verified: reports.filter((r) => r.status === 'verified').length,
      applied: reports.filter((r) => r.status === 'applied').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
    };
  }, [reports]);

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

            {/* Quick Google Sign In for Admin */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleSigningIn}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-[#0a4c9a] bg-slate-50 hover:bg-blue-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2.5 transition shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>ورود مستقیم مدیر با حساب گوگل (تأیید ابری)</span>
              </button>

              <div className="relative my-4 text-center">
                <hr className="border-slate-200" />
                <span className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-white px-2 text-[10px] text-slate-400 font-bold">
                  یا ورود با نام کاربری و رمز
                </span>
              </div>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1">
                  نام کاربری:
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  dir="ltr"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1">
                  رمز عبور اختصاصی:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="رمز ورود..."
                    dir="ltr"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0a4c9a]"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  پیش‌فرض: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{DEFAULT_PASSWORD}</code>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
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
                مدیریت گزارش‌های مراکز درمانی بیمه کارآفرین
              </h1>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل به پایگاه داده ابری (همگام‌سازی لحظه‌ای)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>کل گزارش‌ها</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {toFa(counts.total)}
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

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
            <div className="flex items-center justify-between text-blue-700 text-xs mb-1">
              <span>تأیید شده</span>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 tabular-nums">
              {toFa(counts.verified)}
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

        {/* Toolbar & Export Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل (CSV فارسی)</span>
            </button>

            <button
              onClick={handleCopyForGoogleSheets}
              className="py-2.5 px-4 rounded-xl border border-slate-300 hover:border-[#0a4c9a] hover:bg-blue-50 text-slate-800 text-xs font-bold flex items-center gap-2 transition"
            >
              {copiedForSheets ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">کپی شد! آماده پیست در Google Sheets</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>کپی داده‌ها برای Google Sheets</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-auto">
            <span>تعداد نتایج فیلتر:</span>
            <strong className="text-slate-800 font-black tabular-nums">
              {toFa(filteredReports.length)}
            </strong>
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

        {/* Reports List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0a4c9a] mx-auto mb-2" />
            <span>در حال دریافت گزارش‌ها از پایگاه ابری فایربیس...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">هیچ گزارشی یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              هنوز گزارشی با این فیلترها ثبت نشده است. به محض ارسال گزارش توسط کاربران در اپلیکیشن، بلافاصله در این جدول نمایان خواهد شد.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition hover:border-[#0a4c9a]/40 space-y-3"
                >
                  {/* Top Bar of Card */}
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

                  {/* Body Content */}
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

                  {/* Actions / Change Status Buttons */}
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

        {/* Integration tip for Google Sheets */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#0a4c9a]">
            <FileSpreadsheet className="w-4 h-4 text-[#0a4c9a]" />
            <span>راهنمای استفاده در Google Sheets و Microsoft Excel:</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            ۱. برای خروجی اکسل، روی دکمه <strong>«خروجی اکسل (CSV فارسی)»</strong> کلیک کنید؛ این فایل به صورت UTF-8 استاندارد ذخیره می‌شود تا حروف فارسی در نرم‌افزار Excel کاملاً خوانا باز شوند.
            <br />
            ۲. برای گوگل‌شیت، دکمه <strong>«کپی داده‌ها برای Google Sheets»</strong> را بزنید، سپس یک شیت خالی در گوگل باز کرده و در اولین سلول، کلید <code>Ctrl + V</code> را بفشارید؛ تمام ستون‌ها و ردیف‌ها به شکل مرتب جایگذاری می‌شوند.
          </p>
        </div>
      </main>

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
