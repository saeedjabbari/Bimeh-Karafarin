import React from 'react';
import { Search, X, SlidersHorizontal, Download, Moon, ShieldCheck, MapPin } from 'lucide-react';
import { toFa } from '../utils/persian';
import { CATEGORY_CONFIG, getCategoryMeta } from '../constants/categories';

interface HeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  typeCounts: Record<string, number>;
  selectedStreet: string;
  onOpenStreetFilter: () => void;
  onlyNightShift: boolean;
  onToggleNightShift: () => void;
  resultCount: number;
  isInstallable: boolean;
  onInstall: () => void;
  onSecretAdminTap?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  query,
  onQueryChange,
  selectedType,
  onSelectType,
  typeCounts,
  selectedStreet,
  onOpenStreetFilter,
  onlyNightShift,
  onToggleNightShift,
  resultCount,
  isInstallable,
  onInstall,
  onSecretAdminTap,
}) => {
  const [taps, setTaps] = React.useState(0);

  const handleLogoTap = () => {
    setTaps((prev) => {
      const next = prev + 1;
      if (next >= 4) {
        onSecretAdminTap?.();
        return 0;
      }
      return next;
    });
    setTimeout(() => setTaps(0), 1800);
  };

  const categoryKeys = [
    'all',
    ...Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0a4c9a] text-white shadow-md transition-all">
      {/* Brand Top Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleLogoTap}
              title="بیمه کارآفرین"
              className="w-10 h-10 rounded-xl bg-[#F15A31] flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-xs cursor-default active:scale-95 transition"
            >
              <ShieldCheck className="w-6 h-6 text-white" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight truncate leading-tight">
                مراکز درمانی طرف قرارداد کارآفرین
              </h1>
              <div className="text-[11.5px] text-blue-100/80 font-medium truncate mt-0.5">
                گروه صنعتی اسپوتا · ارومیه
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable && (
              <button
                onClick={onInstall}
                className="flex items-center gap-1.5 bg-white text-[#0a4c9a] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition shadow-sm active:scale-95"
                title="نصب اپلیکیشن"
              >
                <Download className="w-3.5 h-3.5" />
                <span>نصب</span>
              </button>
            )}

            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full tabular-nums border border-white/10">
              {toFa(resultCount)} مرکز
            </span>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="جستجوی نام مرکز، پزشک یا شماره تلفن..."
              className="w-full h-11 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-full pr-10 pl-10 outline-none shadow-sm focus:ring-2 focus:ring-blue-300 transition"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => onQueryChange('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                aria-label="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Street Filter Button */}
          <button
            onClick={onOpenStreetFilter}
            className={`relative h-11 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition shadow-sm shrink-0 active:scale-95 ${
              selectedStreet
                ? 'bg-[#F15A31] text-white hover:bg-[#d94a24]'
                : 'bg-white text-[#0a4c9a] hover:bg-blue-50'
            }`}
            title="فیلتر خیابان‌های ارومیه"
          >
            <MapPin className="w-4 h-4" />
            <span className="inline max-w-[80px] sm:max-w-none truncate">
              {selectedStreet ? selectedStreet : 'خیابان‌ها'}
            </span>
            {selectedStreet && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* Night Shift Toggle */}
          <button
            onClick={onToggleNightShift}
            className={`h-11 px-3 rounded-full flex items-center gap-1 text-xs font-bold transition shadow-sm shrink-0 ${
              onlyNightShift
                ? 'bg-amber-400 text-slate-900 ring-2 ring-white'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
            }`}
            title="فقط مراکز شبانه‌روزی"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">شبانه‌روزی</span>
          </button>
        </div>
      </div>

      {/* Horizontal Category Scroller */}
      <div className="bg-[#093e7d] border-t border-blue-900/40">
        <div className="max-w-4xl mx-auto px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categoryKeys.map((catKey) => {
            const isAll = catKey === 'all';
            const isSelected = isAll ? selectedType === '' : selectedType === catKey;
            const meta = isAll ? CATEGORY_CONFIG.all : getCategoryMeta(catKey);
            const Icon = meta.icon;
            const count = isAll
              ? Object.values(typeCounts).reduce((a, b) => a + b, 0)
              : typeCounts[catKey] || 0;

            return (
              <button
                key={catKey}
                onClick={() => onSelectType(isAll ? '' : catKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  isSelected
                    ? 'bg-white text-[#0a4c9a] shadow-sm'
                    : 'text-blue-100/90 hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0a4c9a]' : 'text-blue-200'}`} />
                <span>{meta.label}</span>
                <span
                  className={`text-[10.5px] tabular-nums font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-blue-100 text-[#0a4c9a]' : 'bg-white/10 text-blue-200'
                  }`}
                >
                  {toFa(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
