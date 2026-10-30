import React, { useEffect } from 'react';
import {
  X,
  Phone,
  Copy,
  Navigation,
  Share2,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Building,
  AlertCircle,
  Hash,
  CheckCircle2,
  CalendarCheck,
  Moon
} from 'lucide-react';
import { MedicalCenter } from '../data/centers';
import { fmtPhone, toFa, getGoogleMapUrl } from '../utils/persian';
import { getCategoryMeta } from '../constants/categories';

interface CenterDetailModalProps {
  center: MedicalCenter | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (k: number) => void;
  onCopyText: (text: string, label?: string) => void;
  onOpenReport: (center: MedicalCenter) => void;
}

export const CenterDetailModal: React.FC<CenterDetailModalProps> = ({
  center,
  onClose,
  isSaved,
  onToggleSave,
  onCopyText,
  onOpenReport,
}) => {
  useEffect(() => {
    if (!center) return;

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Support browser/hardware back button to close sheet
    const stateObj = { modal: 'center-detail' };
    window.history.pushState(stateObj, '');

    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overflow = '';
    };
  }, [center, onClose]);

  if (!center) return null;

  const meta = getCategoryMeta(center.type);
  const Icon = meta.icon;
  const mapUrl = getGoogleMapUrl(center.name, center.address, center.pid);

  const allPhones = [center.phone, ...(center.alt || [])].filter(Boolean);

  const handleShare = async () => {
    const text = `${center.name}\n${center.address}\n${center.phone ? 'تلفن: ' + fmtPhone(center.phone) : ''}\nطرف قرارداد بیمه کارآفرین (اسپوتا)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: center.name, text });
      } catch {
        // User cancelled or not supported
      }
    } else {
      onCopyText(text, 'اطلاعات مرکز کپی شد');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Scrim Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-label="بستن پنجره با لمس پس‌زمینه"
      />

      {/* Sheet Panel */}
      <div className="relative w-[calc(100%-0.5rem)] sm:w-full max-w-lg bg-white rounded-3xl max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl z-10 border border-slate-200 mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-12 h-12 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0 border ${meta.borderColor}`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                  {center.name}
                </h2>

                {center.isNightShift && (
                  <span
                    className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-900 border border-amber-300/80 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs shrink-0 select-none"
                    title="مرکز درمانی شبانه‌روزی (۲۴ ساعته فعال)"
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                    <span>شبانه‌روزی</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{center.type}</span>
                {center.ownership && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span>{center.ownership}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Highly Visible Prominent Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs shrink-0"
            title="بستن و بازگشت به لیست"
            aria-label="بستن پنجره"
          >
            <span>بستن</span>
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Address Box */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
              <MapPin className="w-4 h-4 text-[#0a4c9a]" />
              <span>نشانی مرکز</span>
            </div>
            <p className="text-slate-700 leading-relaxed pr-5">{center.address}</p>
            {center.streets && center.streets.length > 0 && (
              <div className="pr-5 pt-1 text-[11px] text-slate-500">
                <span>محدوده اصلی: </span>
                <span className="font-medium text-slate-700">
                  {center.streets.join('، ')}
                </span>
              </div>
            )}
          </div>

          {/* Contact & ID Box */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>شماره‌های تماس</span>
              </div>
              {center.phone && (
                <button
                  onClick={() => onCopyText(center.phone, 'شماره تماس کپی شد')}
                  className="text-[11px] text-[#0a4c9a] hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>کپی شماره</span>
                </button>
              )}
            </div>

            {allPhones.length > 0 ? (
              <div className="flex flex-wrap gap-2 pr-5">
                {allPhones.map((ph, idx) => (
                  <a
                    key={idx}
                    href={`tel:${ph}`}
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-emerald-500 px-3 py-1.5 rounded-lg text-slate-800 font-bold tabular-nums text-xs transition"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{fmtPhone(ph)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 pr-5">
                تلفن این مرکز در لیست اولیه ثبت نشده است. می‌توانید با جستجوی نام در گوگل شماره را بیابید.
              </p>
            )}

            {center.id && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  شناسه ملی / کد مرکز:
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {toFa(center.id)}
                </span>
              </div>
            )}
          </div>

          {/* Insurance Advice Box */}
          <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 flex items-start gap-2.5">
            <CalendarCheck className="w-4 h-4 text-[#0a4c9a] shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-blue-900 leading-relaxed">
              <strong>توصیه پیش از مراجعه:</strong> جهت اطمینان از برقرار بودن قرارداد آنلاین، فعال بودن سیستم و میزان فرانشیز بیمه، پیشنهاد می‌شود قبل از مراجعه تماس بگیرید.
            </p>
          </div>

          {/* Primary Action Buttons: Call, Navigation, and Bookmark Button */}
          <div className="flex items-center gap-2 pt-2">
            {center.phone ? (
              <a
                href={`tel:${center.phone}`}
                className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">تماس مستقیم</span>
              </a>
            ) : (
              <button
                disabled
                className="flex-1 min-h-[46px] rounded-xl bg-slate-100 text-slate-400 font-medium text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <span>بدون تلفن</span>
              </button>
            )}

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[46px] rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
            >
              <Navigation className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">مسیریابی</span>
            </a>

            {/* Bookmark Button (Beside Navigation) */}
            <button
              type="button"
              onClick={() => onToggleSave(center.k)}
              className={`min-h-[46px] px-3 sm:px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs shrink-0 ${
                isSaved
                  ? 'bg-orange-50 border-orange-200 text-[#F15A31]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isSaved ? 'حذف از نشان‌شده‌ها' : 'نشان کردن این مرکز'}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 fill-[#F15A31] text-[#F15A31]" />
                  <span className="whitespace-nowrap">نشان‌شده</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-slate-600" />
                  <span className="whitespace-nowrap">نشان کردن</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Actions: Report Error & Share */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReport(center);
              }}
              className="min-h-[42px] rounded-xl bg-[#ffedd5] hover:bg-[#fed7aa] active:bg-[#fdba74] text-[#9a3412] border border-[#fdba74] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-2xs"
              title="گزارش خطا یا تغییر مشخصات مرکز"
            >
              <AlertCircle className="w-4 h-4 text-[#ea580c] shrink-0" />
              <span>گزارش خطا</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[42px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>اشتراک‌گذاری</span>
            </button>
          </div>

          {/* Bottom Back / Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-98 border border-slate-200"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>بستن و بازگشت به لیست مراکز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
