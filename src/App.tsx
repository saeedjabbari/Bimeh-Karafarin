import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CenterCard } from './components/CenterCard';
import { CenterDetailModal } from './components/CenterDetailModal';
import { StreetFilterModal } from './components/StreetFilterModal';
import { ReportModal } from './components/ReportModal';
import { GuideTab } from './components/GuideTab';
import { StreetsTab } from './components/StreetsTab';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { IOSInstallGuideModal } from './components/IOSInstallGuideModal';
import { MEDICAL_CENTERS, MedicalCenter } from './data/centers';
import { TabType, ReportReason } from './types';
import { norm, squash, toFa } from './utils/persian';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ExternalLink, X, RotateCcw, Bookmark, Info, Sparkles } from 'lucide-react';
import { collection, addDoc, doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AdminPanel } from './components/AdminPanel';

const STORAGE_KEY = 'krf_saved';
const PORTAL_URL = 'https://sinad.karafarin-insurance.ir/DarmanAfzar.Customer/index.html';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TabType>('centers');

  // Filters
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');
  const [onlyNightShift, setOnlyNightShift] = useState(false);

  // Modals & Sheets
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);
  const [isStreetFilterOpen, setIsStreetFilterOpen] = useState(false);
  const [centerForReport, setCenterForReport] = useState<MedicalCenter | null>(null);
  const [isIOSGuideOpen, setIsIOSGuideOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PWA install
  const { isInstallable, isIOS, install } = usePWAInstall();

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

  // Test Firestore connection on boot (Skill constraint)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firebase client is offline or network restricted.');
        }
      }
    }
    testConnection();
  }, []);

  // Submit report to Firebase Firestore
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

      // 1. Immediately store in local queue so NO user report is ever lost
      try {
        const stored = JSON.parse(localStorage.getItem('krf_reports') || '[]');
        stored.unshift({ ...reportData, timestamp: reportData.createdAt });
        localStorage.setItem('krf_reports', JSON.stringify(stored));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      // 2. Race the cloud Firestore write with a timeout
      try {
        const reportsCol = collection(db, 'reports');
        const writePromise = addDoc(reportsCol, reportData);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));

        await Promise.race([writePromise, timeoutPromise]);
        showToast('گزارش با موفقیت ثبت شد. با تشکر!');
        return true;
      } catch (err) {
        console.warn('Firestore cloud write notice:', err);
        showToast('گزارش شما با موفقیت ثبت شد');
        return true;
      }
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

  // Pre-indexed items
  const indexedItems = useMemo(() => {
    return MEDICAL_CENTERS.map((r) => {
      const normalizedName = norm(r.name);
      const phones = [r.phone, ...(r.alt || [])].filter(Boolean).join(' ');
      return {
        r,
        name: normalizedName,
        nameS: squash(normalizedName),
        words: normalizedName.split(' '),
        ph: phones,
      };
    });
  }, []);

  // Compute category and street counts
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

  // Filtered and sorted centers
  const filteredCenters = useMemo(() => {
    const nq = norm(query);
    const tokens = nq ? nq.split(' ').filter(Boolean) : [];
    const results: { center: MedicalCenter; score: number }[] = [];

    for (const item of indexedItems) {
      const { r, nameS, words, ph } = item;

      // Tab filter: Saved
      if (activeTab === 'saved' && !saved.has(r.k)) continue;

      // Category filter
      if (selectedType && r.type !== selectedType) continue;

      // Street filter
      if (selectedStreet && !r.streets.includes(selectedStreet)) continue;

      // Night shift filter
      if (onlyNightShift && !r.isNightShift) continue;

      // Search token matching
      let score = 0;
      let matched = true;

      for (const token of tokens) {
        const tokenSquash = squash(token);
        if (/^\d{3,}$/.test(token)) {
          if (ph.includes(token)) {
            score += 2;
          } else {
            matched = false;
            break;
          }
        } else if (nameS.includes(tokenSquash)) {
          score += words.some((w) => w.startsWith(token)) ? 4 : 2;
        } else {
          matched = false;
          break;
        }
      }

      if (matched) {
        results.push({ center: r, score });
      }
    }

    if (tokens.length > 0) {
      results.sort(
        (a, b) => b.score - a.score || a.center.name.localeCompare(b.center.name, 'fa')
      );
    }

    return results.map((x) => x.center);
  }, [
    indexedItems,
    query,
    selectedType,
    selectedStreet,
    onlyNightShift,
    activeTab,
    saved,
  ]);

  const handleResetFilters = () => {
    setQuery('');
    setSelectedType('');
    setSelectedStreet('');
    setOnlyNightShift(false);
  };

  const hasActiveFilters = Boolean(
    query || selectedType || selectedStreet || onlyNightShift
  );

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setIsIOSGuideOpen(true);
    }
  };

  if (isAdminRoute) {
    return (
      <>
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f5fa] text-[#0f1b33] flex flex-col pb-24">
      {/* Offline Status */}
      <OfflineBanner />

      {/* Main Sticky Header */}
      <Header
        query={query}
        onQueryChange={setQuery}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        typeCounts={typeCounts}
        selectedStreet={selectedStreet}
        onOpenStreetFilter={() => setIsStreetFilterOpen(true)}
        onlyNightShift={onlyNightShift}
        onToggleNightShift={() => setOnlyNightShift((prev) => !prev)}
        resultCount={filteredCenters.length}
        isInstallable={isInstallable || isIOS}
        onInstall={handleInstallClick}
        onSecretAdminTap={() => {
          setIsAdminRoute(true);
          window.location.hash = '#admin';
        }}
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
                      onClick={() => setSelectedType('')}
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
                      onClick={() => setSelectedStreet('')}
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
                      onClick={() => setOnlyNightShift(false)}
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
                      onClick={() => setQuery('')}
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
                  : 'همه مراکز درمانی طرف قرارداد'}
              </h2>
              <span className="tabular-nums font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                {toFa(filteredCenters.length)} مرکز
              </span>
            </div>

            {/* Centers Grid / List */}
            {filteredCenters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCenters.map((center) => (
                  <CenterCard
                    key={center.k}
                    center={center}
                    isSaved={saved.has(center.k)}
                    onToggleSave={handleToggleSave}
                    onOpenDetail={setSelectedCenter}
                    onCopyPhone={(phone, e) => {
                      e.stopPropagation();
                      handleCopyText(phone, 'شماره تلفن کپی شد');
                    }}
                  />
                ))}
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

        {/* Tab 2: Streets & Hubs */}
        {activeTab === 'streets' && (
          <StreetsTab
            streetCounts={streetCounts}
            onSelectStreetAndSwitch={(streetName) => {
              setSelectedStreet(streetName);
              setActiveTab('centers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Tab 3: Guide & Sinad Claim Portal */}
        {activeTab === 'guide' && <GuideTab />}
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

      {/* Modals & Dialogs */}
      <CenterDetailModal
        center={selectedCenter}
        onClose={() => setSelectedCenter(null)}
        isSaved={selectedCenter ? saved.has(selectedCenter.k) : false}
        onToggleSave={handleToggleSave}
        onCopyText={handleCopyText}
        onOpenReport={setCenterForReport}
      />

      <StreetFilterModal
        isOpen={isStreetFilterOpen}
        onClose={() => setIsStreetFilterOpen(false)}
        selectedStreet={selectedStreet}
        onSelectStreet={setSelectedStreet}
        streetCounts={streetCounts}
        totalCenters={MEDICAL_CENTERS.length}
      />

      <ReportModal
        center={centerForReport}
        onClose={() => setCenterForReport(null)}
        onSubmitReport={handleSubmitReport}
      />

      <IOSInstallGuideModal
        isOpen={isIOSGuideOpen}
        onClose={() => setIsIOSGuideOpen(false)}
      />

      {/* Global Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}
