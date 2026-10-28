import React, { useEffect } from 'react';
import { X, Search, MapPin, Info, Check, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';

interface QuickOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSearch?: () => void;
}

export const QuickOnboardingModal: React.FC<QuickOnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartSearch,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFinish = (action?: 'search' | 'close') => {
    try {
      localStorage.setItem('krf_onboarding_seen', 'true');
    } catch {}
    onClose();
    if (action === 'search' && onStartSearch) {
      setTimeout(() => {
        onStartSearch();
      }, 150);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => handleFinish('close')}
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-l from-[#0a4c9a] to-[#1864c2] p-5 text-white relative">
          <button
            onClick={() => handleFinish('close')}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-95"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 bg-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>راهنمای ۳ ثانیه‌ای</span>
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold leading-tight">
            دسترسی سریع به مراکز درمانی ارومیه
          </h2>
          <p className="text-xs text-blue-100/90 mt-1">
            طرف قرارداد بیمه کارآفرین · گروه صنعتی اسپوتا
          </p>
        </div>

        {/* 3 Quick Steps */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0a4c9a] flex items-center justify-center shrink-0 font-bold border border-blue-200">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-slate-900 font-extrabold block text-xs">
                ۱. جستجوی مستقیم و هوشمند
              </strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed text-[11.5px]">
                نام پزشک، درمانگاه، آزمایشگاه یا تخصص را در کادر بالای صفحه بنویسید تا بلافاصله پیدایش کنید.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F15A31] flex items-center justify-center shrink-0 font-bold border border-orange-200">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-slate-900 font-extrabold block text-xs">
                ۲. فیلتر خیابان‌های ارومیه
              </strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed text-[11.5px]">
                با دکمه «خیابان‌ها»، مراکز نزدیک به خودتان (حسنی، مولوی، خیام و...) را به تفکیک مشاهده نمایید.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold border border-emerald-200">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-slate-900 font-extrabold block text-xs">
                ۳. اطلاعات تماس و مسیریابی
              </strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed text-[11.5px]">
                روی دکمه «جزئیات» یا هر کارت کلیک کنید تا تمام شماره‌ها، کدملی مرکز و لوکیشن دقیق را ببینید.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleFinish('search')}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0a4c9a] to-[#1864c2] hover:from-blue-900 hover:to-[#0a4c9a] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ورود و شروع جستجوی مراکز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
