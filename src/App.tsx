import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { CenterList } from './components/CenterList';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { MEDICAL_CENTERS, MedicalCenter } from './data/centers';
import { TabType, ReportReason } from './types';
import { norm, squash, toFa } from './utils/persian';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ExternalLink, X, RotateCcw, Bookmark, Info, Sparkles, Search, MapPin, Mail, ChevronDown } from 'lucide-react';
import { submitReportToSheets, recordSearchToSheets, flushOfflineSearchQueue } from './lib/sheets';
import { useCenterWorkerFilter } from './hooks/useCenterWorkerFilter';

// Lazy-loaded components for optimal initial bundle and fastest First Contentful Paint
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const CenterDetailModal = lazy(() => import('./components/CenterDetailModal').then((m) => ({ default: m.CenterDetailModal })));
const StreetFilterModal = lazy(() => import('./components/StreetFilterModal').then((m) => ({ default: m.StreetFilterModal })));
const ReportModal = lazy(() => import('./components/ReportModal').then((m) => ({ default: m.ReportModal })));
const GuideTab = lazy(() => import('./components/GuideTab').then((m) => ({ default: m.GuideTab })));
const IOSInstallGuideModal = lazy(() => import('./components/IOSInstallGuideModal').then((m) => ({ default: m.IOSInstallGuideModal })));
const QuickOnboardingModal = lazy(() => import('./components/QuickOnboardingModal').then((m) => ({ default: m.QuickOnboardingModal })));

const STORAGE_KEY = 'krf_saved';
const PORTAL_URL = 'https://sinad.karafarin-insurance.ir/DarmanAfzar.Customer/index.html';

// Fisher-Yates shuffle to randomize centers on each refresh / session
function shuffleCenters(centers: MedicalCenter[]): MedicalCenter[] {
  const shuffled = [...centers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TabType>('centers');

  // Filters
  const [query, setQuery] = useState('');
  const deferredQuery = React.useDeferredValue(query);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');
  const [onlyNightShift, setOnlyNightShift] = useState(false);

  // Modals & Sheets
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);
  const [isStreetFilterOpen, setIsStreetFilterOpen] = useState(false);
  const [centerForReport, setCenterForReport] = useState<MedicalCenter | null>(null);
  const [isIOSGuideOpen, setIsIOSGuideOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Auto-open Quick Onboarding only on user's first visit and flush offline searches
  useEffect(() => {
    flushOfflineSearchQueue().catch(() => {});
    try {
      const seen = localStorage.getItem('krf_onboarding_seen');
      if (!seen) {
        const timer = setTimeout(() => {
          setIsOnboardingOpen(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PWA install
  const { isInstallable, isIOS, install } = usePWAInstall();

  // Scroll & Display Limit (encouraging search)
  const [visibleLimit, setVisibleLimit] = useState(10);

  const handleFocusSearch = useCallback(() => {
    setActiveTab('centers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const input = document.getElementById('main-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select?.();
      }
    }, 200);
  }, []);



  // Bookmarks (Saved)
  const [saved, setSaved] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const t = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  // Hidden /admin route check (no visible UI button)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path === '/admin' ||
      path.endsWith('/admin') ||
      hash === '#admin' ||
      search.includes('admin')
    );
  });

  useEffect(() => {
    const handleLocationCheck = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      setIsAdminRoute(
        path === '/admin' ||
        path.endsWith('/admin') ||
        hash === '#admin' ||
        search.includes('admin')
      );
    };

    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, []);



  // Submit report optimistically to Google Sheets and cloud storage
  const handleSubmitReport = useCallback(
    async (
      center: MedicalCenter,
      reason: ReportReason,
      reasonLabel: string,
      details: string,
      reporterContact: string
    ): Promise<boolean> => {
      const reportData = {
        centerId: center.k,
        centerName: center.name,
        centerType: center.type || 'مرکز درمانی',
        reason,
        reasonLabel,
        details: details || '',
        reporterContact: reporterContact || '',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      // 1. Instant optimistic local save
      try {
        const stored = JSON.parse(localStorage.getItem('krf_reports') || '[]');
        stored.unshift({
          ...reportData,
          timestamp: reportData.createdAt,
          syncedToCloud: true,
        });
        localStorage.setItem('krf_reports', JSON.stringify(stored));

        // Also update admin cache if exists
        const adminCache = JSON.parse(localStorage.getItem('krf_admin_cached_reports') || '[]');
        adminCache.unshift({
          ...reportData,
          id: `local-${Date.now()}`,
        });
        localStorage.setItem('krf_admin_cached_reports', JSON.stringify(adminCache));
      } catch (e) {
        console.warn('LocalStorage save notice:', e);
      }

      // 2. Fire Google Sheets submit in background
      submitReportToSheets(reportData).catch((err) => {
        console.warn('Background sheets submit note:', err);
      });


      // Short 300ms pause for natural tactile feedback
      await new Promise((r) => setTimeout(r, 300));
      showToast('گزارش با موفقیت ثبت شد');
      return true;
    },
    [showToast]
  );

  const handleToggleSave = useCallback((k: number) => {
    setSaved((prev) => {
      const next = new Set(prev);
      const isRemoving = next.has(k);
      if (isRemoving) {
        next.delete(k);
        showToast('از نشان‌شده‌ها حذف شد');
      } else {
        next.add(k);
        showToast('به نشان‌شده‌ها اضافه شد');
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, [showToast]);

  const handleCopyText = useCallback((text: string, label: string = 'کپی شد') => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(label),
        () => fallbackCopy(text, label)
      );
    } else {
      fallbackCopy(text, label);
    }

    function fallbackCopy(txt: string, msg: string) {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        showToast(msg);
      } catch {
        showToast('کپی انجام نشد');
      }
      document.body.removeChild(ta);
    }
  }, [showToast]);

  // Compute category and street counts once
  const { typeCounts, streetCounts } = useMemo(() => {
    const tCounts: Record<string, number> = {};
    const sCounts: Record<string, number> = {};

    MEDICAL_CENTERS.forEach((c) => {
      tCounts[c.type] = (tCounts[c.type] || 0) + 1;
      c.streets.forEach((s) => {
        sCounts[s] = (sCounts[s] || 0) + 1;
      });
    });

    return { typeCounts: tCounts, streetCounts: sCounts };
  }, []);

  // Offload heavy filtering and sorting to dedicated Web Worker (keeps main UI thread at 60 FPS)
  const filteredCenters = useCenterWorkerFilter({
    query: deferredQuery,
    selectedType,
    selectedStreet,
    onlyNightShift,
    saved,
    activeTab,
  });

  const isSearching = deferredQuery.trim().length > 0;

  // Capped cards to encourage search (limit to ~10 on browsing, full list on search or saved)
  const displayedCenters = useMemo(() => {
    if (isSearching || activeTab === 'saved') {
      return filteredCenters;
    }
    return filteredCenters.slice(0, visibleLimit);
  }, [filteredCenters, isSearching, activeTab, visibleLimit]);

  const hasMoreToSearch =
    !isSearching &&
    activeTab !== 'saved' &&
    filteredCenters.length > displayedCenters.length;

  const lastRecordedQueryRef = React.useRef<string>('');

  const searchFilterStateRef = React.useRef({
    query,
    resultCount: filteredCenters.length,
    selectedStreet,
    selectedType,
    topMatch: filteredCenters[0] as MedicalCenter | undefined,
  });

  useEffect(() => {
    searchFilterStateRef.current = {
      query,
      resultCount: filteredCenters.length,
      selectedStreet,
      selectedType,
      topMatch: filteredCenters[0],
    };
  });

  // Handle opening center detail + logging partial/completed search intent with clicked center
  const handleOpenCenterDetail = useCallback((center: MedicalCenter) => {
    setSelectedCenter(center);
    const { query: currentQuery, resultCount, selectedStreet: currentStreet, selectedType: currentType } = searchFilterStateRef.current;
    const q = currentQuery.trim();
    if (q.length >= 2 && lastRecordedQueryRef.current !== q) {
      lastRecordedQueryRef.current = q;
      recordSearchToSheets({
        term: q,
        resultCount,
        selectedStreet: currentStreet || undefined,
        selectedType: currentType || undefined,
        clickedCenter: `${center.name} (${center.type})`,
      }).catch(() => {});
    }
  }, []);

  // Immediate search logging (e.g. when pressing Enter or tapping Search)
  const handleImmediateSearchLog = useCallback(() => {
    const { query: currentQuery, resultCount, selectedStreet: currentStreet, selectedType: currentType, topMatch } = searchFilterStateRef.current;
    const q = currentQuery.trim();
    if (q.length < 2) return;
    if (lastRecordedQueryRef.current !== q) {
      lastRecordedQueryRef.current = q;
      recordSearchToSheets({
        term: q,
        resultCount,
        selectedStreet: currentStreet || undefined,
        selectedType: currentType || undefined,
        clickedCenter: topMatch ? `مشاهده نتایج (نزدیک‌ترین: ${topMatch.name})` : undefined,
      }).catch(() => {});
    }
  }, []);

  // Intelligent Debounced Search Logging to Google Sheets for Marketing & Demand Analytics
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      if (!q) lastRecordedQueryRef.current = '';
      return;
    }

    const timer = setTimeout(() => {
      handleImmediateSearchLog();
    }, 1400);

    return () => clearTimeout(timer);
  }, [query, handleImmediateSearchLog]);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setVisibleLimit(10);
    if (newQuery.trim().length > 0) {
      setActiveTab((prev) => (prev !== 'centers' ? 'centers' : prev));
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    setActiveTab((prev) => (prev !== 'centers' ? 'centers' : prev));
  }, []);

  const handleSelectType = useCallback((t: string) => {
    React.startTransition(() => {
      setSelectedType(t);
      setVisibleLimit(10);
      setActiveTab((prev) => (prev !== 'centers' ? 'centers' : prev));
    });
  }, []);

  const handleOpenStreetFilter = useCallback(() => {
    setIsStreetFilterOpen(true);
    setActiveTab((prev) => (prev !== 'centers' ? 'centers' : prev));
  }, []);

  const handleToggleNightShift = useCallback(() => {
    React.startTransition(() => {
      setOnlyNightShift((prev) => !prev);
      setVisibleLimit(10);
      setActiveTab((prev) => (prev !== 'centers' ? 'centers' : prev));
    });
  }, []);

  const handleSecretAdminTap = useCallback(() => {
    setIsAdminRoute(true);
    window.location.hash = '#admin';
  }, []);

  const handleCopyPhone = useCallback((phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleCopyText(phone, 'شماره تلفن کپی شد');
  }, [handleCopyText]);

  const handleResetFilters = useCallback(() => {
    setQuery('');
    setSelectedType('');
    setSelectedStreet('');
    setOnlyNightShift(false);
    setVisibleLimit(10);
    setActiveTab('centers');
  }, []);

  const hasSelectionFilter = Boolean(selectedType || selectedStreet || onlyNightShift);
  const hasActiveFilters = Boolean(
    query || selectedType || selectedStreet || onlyNightShift
  );

  const handleInstallClick = useCallback(() => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setIsIOSGuideOpen(true);
    }
  }, [isInstallable, install, isIOS]);

  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f2f5fa] flex flex-col items-center justify-center p-4">
            <div className="w-9 h-9 border-3 border-[#0a4c9a] border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-xs font-bold text-slate-600">در حال بارگذاری پنل مدیریت...</div>
          </div>
        }
      >
        <AdminPanel
          onBackToApp={() => {
            if (window.location.hash === '#admin') {
              window.location.hash = '';
            } else if (
              window.location.pathname === '/admin' ||
              window.location.pathname.endsWith('/admin')
            ) {
              window.history.pushState(
                {},
                '',
                window.location.pathname.replace(/\/admin\/?$/, '') || '/'
              );
            }
            setIsAdminRoute(false);
          }}
          showToast={showToast}
        />
        <Toast message={toastMessage} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f5fa] text-[#0f1b33] flex flex-col pb-24">
      {/* Offline Status */}
      <OfflineBanner />

      {/* Main Sticky Header */}
      <Header
        query={query}
        onQueryChange={handleQueryChange}
        onSearchFocus={handleSearchFocus}
        selectedType={selectedType}
        onSelectType={handleSelectType}
        typeCounts={typeCounts}
        selectedStreet={selectedStreet}
        onOpenStreetFilter={handleOpenStreetFilter}
        onlyNightShift={onlyNightShift}
        onToggleNightShift={handleToggleNightShift}
        resultCount={filteredCenters.length}
        isInstallable={isInstallable || isIOS}
        onInstall={handleInstallClick}
        onSecretAdminTap={handleSecretAdminTap}
        onSubmitSearch={handleImmediateSearchLog}
      />

      {/* Main Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-3 pb-8">
        {/* Tab 1: Centers / Saved */}
        {(activeTab === 'centers' || activeTab === 'saved') && (
          <div className="space-y-3">
            {/* Active Filter Badges Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs shadow-xs">
                <span className="text-slate-500 font-bold ml-1">فیلترهای فعال:</span>

                {selectedType && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0a4c9a] font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                    <span>دسته‌بندی: {selectedType}</span>
                    <button
                      onClick={() => handleSelectType('')}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedStreet && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-[#F15A31] font-bold px-2.5 py-1 rounded-lg border border-orange-200">
                    <span>خیابان: {selectedStreet}</span>
                    <button
                      onClick={() => {
                        setSelectedStreet('');
                        setVisibleLimit(10);
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {onlyNightShift && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                    <span>فقط شبانه‌روزی</span>
                    <button
                      onClick={() => {
                        setOnlyNightShift(false);
                        setVisibleLimit(10);
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {query && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200">
                    <span>جستجو: «{query}»</span>
                    <button
                      onClick={() => handleQueryChange('')}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0a4c9a] font-bold mr-auto px-2 py-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>پاک کردن همه</span>
                </button>
              </div>
            )}

            {/* Non-Contract Promo Box */}
            {activeTab === 'centers' && !hasActiveFilters && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a4c9a] to-[#2575dc] p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative z-10 max-w-xl">
                  <div className="flex items-center gap-1.5 font-extrabold text-sm mb-1 text-white">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>مرکز مورد نظر شما طرف قرارداد نبود؟</span>
                  </div>
                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    می‌توانید فاکتور و مدارک درمان را در پورتال جامع سیناد بیمه کارآفرین بارگذاری و ثبت خسارت فرمایید.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('guide')}
                  className="relative z-10 shrink-0 bg-white text-[#0a4c9a] hover:bg-blue-50 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition active:scale-98"
                >
                  راهنمای ثبت خسارت
                </button>
              </div>
            )}

            {/* List Header Count */}
            <div className="flex items-center justify-between text-xs text-slate-600 px-1 pt-1">
              <h2 className="font-extrabold text-slate-800 text-sm">
                {activeTab === 'saved'
                  ? 'مراکز نشان‌شده شما'
                  : selectedStreet
                  ? `مراکز خیابان ${selectedStreet}`
                  : selectedType
                  ? `مراکز دسته ${selectedType}`
                  : 'مراکز درمانی طرف قرارداد'}
              </h2>
              {(hasActiveFilters || activeTab === 'saved') && (
                <span className="tabular-nums font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                  {toFa(filteredCenters.length)} مرکز
                </span>
              )}
            </div>

            {/* Centers Grid / List */}
            {filteredCenters.length > 0 ? (
              <div className="space-y-4">
                <CenterList
                  centers={displayedCenters}
                  saved={saved}
                  onToggleSave={handleToggleSave}
                  onOpenDetail={handleOpenCenterDetail}
                  onCopyPhone={handleCopyPhone}
                />

                {/* Search Encouragement & Limit Box */}
                {hasMoreToSearch && (
                  <div className="bg-gradient-to-b from-white to-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200/90 p-5 sm:p-6 text-center space-y-3.5 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-[#0a4c9a] flex items-center justify-center mx-auto border border-blue-200 shadow-2xs">
                      <Search className="w-6 h-6 text-[#0a4c9a]" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                        مرکز یا پزشک خاصی مد نظرتان است؟
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                        برای دسترسی سریع به نشانی و شماره تماس هر مرکز، نام مرکز، پزشک یا تخصص مورد نظر را در کادر بالا جستجو کنید.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                      {/* Show continue results button when any filter is active */}
                      {hasSelectionFilter && (
                        <button
                          type="button"
                          onClick={() => setVisibleLimit((prev) => prev + 10)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                          <ChevronDown className="w-4 h-4" />
                          <span>نمایش ادامه نتایج ({toFa(filteredCenters.length - displayedCenters.length)} مرکز دیگر)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleFocusSearch}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
                      >
                        <Search className="w-4 h-4" />
                        <span>جستجوی نام مرکز یا پزشک</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsStreetFilterOpen(true)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-orange-50 text-[#F15A31] text-xs font-bold transition flex items-center justify-center gap-2 border border-orange-200 active:scale-95 shadow-2xs"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>فیلتر خیابان‌ها</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {activeTab === 'saved'
                    ? 'هنوز هیچ مرکزی را نشان نکرده‌اید'
                    : 'مرکزی با این مشخصات یافت نشد'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {activeTab === 'saved'
                    ? 'با زدن دکمه نشان (بوکمارک) روی هر مرکز، آن را به این لیست اضافه کنید تا همیشه در دسترس باشد.'
                    : 'مرکز احتمالاً طرف قرارداد نیست یا املای نام متفاوت است. فیلترها را بازنشانی فرمایید یا از پورتال سیناد استفاده کنید.'}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2.5 rounded-xl bg-[#0a4c9a] text-white text-xs font-bold hover:bg-blue-900 transition"
                    >
                      بازنشانی همه فیلترها
                    </button>
                  )}
                  {activeTab === 'saved' && (
                    <button
                      onClick={() => setActiveTab('centers')}
                      className="px-4 py-2.5 rounded-xl bg-[#0a4c9a] text-white text-xs font-bold hover:bg-blue-900 transition"
                    >
                      مشاهده همه مراکز
                    </button>
                  )}
                  <a
                    href={PORTAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    <span>ورود به پورتال سیناد</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Guide & Sinad Claim Portal */}
        {activeTab === 'guide' && (
          <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">در حال بارگذاری راهنما...</div>}>
            <GuideTab onOpenOnboarding={() => setIsOnboardingOpen(true)} />
          </Suspense>
        )}

        {/* Subtle App & Developer Footer Credit */}
        <footer className="text-center pt-6 pb-2 text-xs text-slate-400 space-y-1.5 border-t border-slate-200/60 mt-6">
          <div className="font-semibold text-slate-600">
            سامانه مراکز درمانی کارآفرین ارومیه · گروه صنعتی اسپوتا
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span>طراح و توسعه‌دهنده نرم‌افزار:</span>
            <button
              onClick={() => {
                setActiveTab('guide');
                window.scrollTo({ top: 9999, behavior: 'smooth' });
              }}
              className="font-bold text-[#0a4c9a] hover:underline"
            >
              سعید جباری
            </button>
            <span className="text-slate-300">·</span>
            <a
              href="mailto:saeedjabbari21@gmail.com"
              className="text-slate-600 hover:text-[#0a4c9a] font-bold hover:underline inline-flex items-center gap-1 text-xs"
              title="ارسال ایمیل به توسعه‌دهنده"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email</span>
            </a>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="text-[#F15A31] hover:underline font-bold"
            >
              راهنمای سریع
            </button>
          </div>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(newTab) => {
          setActiveTab(newTab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        savedCount={saved.size}
      />

      {/* Modals & Dialogs (Loaded on-demand only when triggered) */}
      <Suspense fallback={null}>
        {selectedCenter && (
          <CenterDetailModal
            center={selectedCenter}
            onClose={() => setSelectedCenter(null)}
            isSaved={saved.has(selectedCenter.k)}
            onToggleSave={handleToggleSave}
            onCopyText={handleCopyText}
            onOpenReport={setCenterForReport}
          />
        )}

        {isStreetFilterOpen && (
          <StreetFilterModal
            isOpen={isStreetFilterOpen}
            onClose={() => setIsStreetFilterOpen(false)}
            selectedStreet={selectedStreet}
            onSelectStreet={(s) => {
              setSelectedStreet(s);
              setVisibleLimit(10);
              if (activeTab !== 'centers') {
                setActiveTab('centers');
              }
            }}
            streetCounts={streetCounts}
            totalCenters={MEDICAL_CENTERS.length}
          />
        )}

        {centerForReport && (
          <ReportModal
            center={centerForReport}
            onClose={() => setCenterForReport(null)}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {isIOSGuideOpen && (
          <IOSInstallGuideModal
            isOpen={isIOSGuideOpen}
            onClose={() => setIsIOSGuideOpen(false)}
          />
        )}

        {isOnboardingOpen && (
          <QuickOnboardingModal
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
            onStartSearch={handleFocusSearch}
          />
        )}
      </Suspense>

      {/* Global Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}
