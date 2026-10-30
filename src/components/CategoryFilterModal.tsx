import React from 'react';
import {
  X,
  LayoutGrid,
  FlaskConical,
  Smile,
  Building2,
  Stethoscope,
  Scan,
  Activity,
  Pill,
  Scissors,
  UserRound,
  Atom,
  Cross,
  Sparkles,
} from 'lucide-react';
import { toFa } from '../utils/persian';

export interface CategoryCardItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgLight: string;
  borderLight: string;
  textCol: string;
  iconBg: string;
  badgeBg: string;
}

const CATEGORY_ITEMS: CategoryCardItem[] = [
  {
    key: '',
    label: 'همه مراکز',
    icon: LayoutGrid,
    gradient: 'from-[#0a4c9a] to-[#1e40af]',
    bgLight: 'bg-blue-50/80 hover:bg-blue-100/70',
    borderLight: 'border-blue-200/90',
    textCol: 'text-[#0a4c9a]',
    iconBg: 'bg-blue-100 text-[#0a4c9a]',
    badgeBg: 'bg-blue-100 text-[#0a4c9a]',
  },
  {
    key: 'داروخانه',
    label: 'داروخانه‌ها',
    icon: Pill,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50/80 hover:bg-emerald-100/70',
    borderLight: 'border-emerald-200/90',
    textCol: 'text-emerald-900',
    iconBg: 'bg-emerald-100 text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'دندانپزشکی',
    label: 'دندانپزشکی',
    icon: Smile,
    gradient: 'from-teal-500 to-cyan-600',
    bgLight: 'bg-teal-50/80 hover:bg-teal-100/70',
    borderLight: 'border-teal-200/90',
    textCol: 'text-teal-900',
    iconBg: 'bg-teal-100 text-teal-700',
    badgeBg: 'bg-teal-100 text-teal-800',
  },
  {
    key: 'آزمایشگاه',
    label: 'آزمایشگاه‌ها',
    icon: FlaskConical,
    gradient: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50/80 hover:bg-indigo-100/70',
    borderLight: 'border-indigo-200/90',
    textCol: 'text-indigo-900',
    iconBg: 'bg-indigo-100 text-indigo-700',
    badgeBg: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'بیمارستان',
    label: 'بیمارستان‌ها',
    icon: Building2,
    gradient: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50/80 hover:bg-rose-100/70',
    borderLight: 'border-rose-200/90',
    textCol: 'text-rose-900',
    iconBg: 'bg-rose-100 text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  {
    key: 'تصویربرداری',
    label: 'تصویربرداری',
    icon: Scan,
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50/80 hover:bg-sky-100/70',
    borderLight: 'border-sky-200/90',
    textCol: 'text-sky-900',
    iconBg: 'bg-sky-100 text-sky-700',
    badgeBg: 'bg-sky-100 text-sky-800',
  },
  {
    key: 'فیزیوتراپی',
    label: 'فیزیوتراپی',
    icon: Activity,
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50/80 hover:bg-purple-100/70',
    borderLight: 'border-purple-200/90',
    textCol: 'text-purple-900',
    iconBg: 'bg-purple-100 text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'درمانگاه',
    label: 'درمانگاه‌ها',
    icon: Stethoscope,
    gradient: 'from-cyan-600 to-teal-600',
    bgLight: 'bg-cyan-50/80 hover:bg-cyan-100/70',
    borderLight: 'border-cyan-200/90',
    textCol: 'text-cyan-900',
    iconBg: 'bg-cyan-100 text-cyan-700',
    badgeBg: 'bg-cyan-100 text-cyan-800',
  },
  {
    key: 'مرکز جراحی محدود',
    label: 'جراحی محدود',
    icon: Scissors,
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50/80 hover:bg-amber-100/70',
    borderLight: 'border-amber-200/90',
    textCol: 'text-amber-900',
    iconBg: 'bg-amber-100 text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'پزشکی هسته‌ای',
    label: 'پزشکی هسته‌ای',
    icon: Atom,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgLight: 'bg-fuchsia-50/80 hover:bg-fuchsia-100/70',
    borderLight: 'border-fuchsia-200/90',
    textCol: 'text-fuchsia-900',
    iconBg: 'bg-fuchsia-100 text-fuchsia-700',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-800',
  },
  {
    key: 'مطب',
    label: 'مطب پزشکان',
    icon: UserRound,
    gradient: 'from-slate-600 to-slate-800',
    bgLight: 'bg-slate-100 hover:bg-slate-200/70',
    borderLight: 'border-slate-300',
    textCol: 'text-slate-800',
    iconBg: 'bg-slate-200 text-slate-700',
    badgeBg: 'bg-slate-200 text-slate-700',
  },
  {
    key: 'کلینیک',
    label: 'کلینیک‌ها',
    icon: Cross,
    gradient: 'from-blue-600 to-indigo-700',
    bgLight: 'bg-blue-50/80 hover:bg-blue-100/70',
    borderLight: 'border-blue-200/90',
    textCol: 'text-blue-900',
    iconBg: 'bg-blue-100 text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
];

interface CategoryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: string;
  onSelectType: (type: string) => void;
  typeCounts: Record<string, number>;
  totalCenters: number;
}

export const CategoryFilterModal: React.FC<CategoryFilterModalProps> = ({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  typeCounts,
  totalCenters,
}) => {
  if (!isOpen) return null;

  const handleSelect = (categoryKey: string) => {
    if (selectedType === categoryKey && categoryKey !== '') {
      onSelectType('');
    } else {
      onSelectType(categoryKey);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-label="بستن پنجره با لمس پس‌زمینه"
      />

      {/* Modal Dialog (Fits completely on screen without scrolling) */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 border border-slate-200 overflow-hidden mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0a4c9a] to-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                فیلتر تخصص‌ها
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                انتخاب سریع تخصص مراکز درمانی طرف قرارداد
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-black text-xs flex items-center gap-1 transition active:scale-95"
            aria-label="بستن"
          >
            <span>بستن</span>
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Pinterest/Bento Grid without scrolling */}
        <div className="p-3 sm:p-4 bg-[#f8fafc]">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {CATEGORY_ITEMS.map((item) => {
              const isSelected = item.key === '' ? selectedType === '' : selectedType === item.key;
              const count = item.key === '' ? totalCenters : typeCounts[item.key] || 0;
              const IconComp = item.icon;

              return (
                <button
                  key={item.key || 'all'}
                  type="button"
                  onClick={() => handleSelect(item.key)}
                  className={`p-2 sm:p-2.5 rounded-2xl flex flex-col justify-between transition-all duration-150 active:scale-95 select-none text-right border ${
                    isSelected
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-md ring-2 ring-black/20 border-transparent`
                      : `${item.bgLight} border ${item.borderLight} ${item.textCol} hover:shadow-2xs`
                  }`}
                >
                  {/* Top Bar: Icon + Count */}
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : item.iconBg
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-[10px] tabular-nums font-black px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/25 text-white' : item.badgeBg
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{toFa(count)}
                    </span>
                  </div>

                  {/* Category Title Only */}
                  <span className="text-[11px] sm:text-xs font-black truncate w-full tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
