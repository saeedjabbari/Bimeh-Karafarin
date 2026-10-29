import React from 'react';
import { Phone, Copy, Navigation, Bookmark, BookmarkCheck, MapPin, Search, Info } from 'lucide-react';
import { MedicalCenter } from '../data/centers';
import { fmtPhone, getGoogleMapUrl, getSearchPhoneUrl } from '../utils/persian';
import { getCategoryMeta } from '../constants/categories';

interface CenterCardProps {
  center: MedicalCenter;
  isSaved: boolean;
  onToggleSave: (k: number) => void;
  onOpenDetail: (center: MedicalCenter) => void;
  onCopyPhone: (phone: string, e: React.MouseEvent) => void;
}

export const CenterCard: React.FC<CenterCardProps> = React.memo(({
  center,
  isSaved,
  onToggleSave,
  onOpenDetail,
  onCopyPhone,
}) => {
  const meta = getCategoryMeta(center.type);
  const Icon = meta.icon;
  const mapUrl = getGoogleMapUrl(center.name, center.address, center.pid);

  return (
    <article
      onClick={() => onOpenDetail(center)}
      className="card-contain bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-colors duration-150 cursor-pointer flex flex-col gap-3 group"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0 border ${meta.borderColor}`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-slate-900 group-hover:text-[#0a4c9a] transition leading-snug">
              {center.name}
            </h2>

            {/* Zero-Pill Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{center.type}</span>
              {center.ownership && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{center.ownership}</span>
                </>
              )}
              {center.isNightShift && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-amber-700 font-bold">شبانه‌روزی</span>
                </>
              )}
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="tabular-nums font-medium text-slate-600">
                {center.phone ? fmtPhone(center.phone) : 'تلفن در لیست نیست'}
              </span>
            </div>
          </div>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(center.k);
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
            isSaved
              ? 'bg-orange-50 text-[#F15A31] hover:bg-orange-100'
              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={isSaved ? 'حذف از نشان‌شده‌ها' : 'نشان کردن'}
          aria-label="نشان کردن"
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4 fill-[#F15A31]" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
        <MapPin className="w-3.5 h-3.5 text-[#0a4c9a] shrink-0 mt-0.5" />
        <span className="leading-relaxed line-clamp-2">{center.address}</span>
      </div>

      {/* Action Buttons Row */}
      <div
        className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Call or Search Phone Button */}
        {center.phone ? (
          <a
            href={`tel:${center.phone}`}
            className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-98 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">تماس</span>
          </a>
        ) : (
          <a
            href={getSearchPhoneUrl(center.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">جستجو</span>
          </a>
        )}

        {/* Copy Phone */}
        {center.phone ? (
          <button
            onClick={(e) => onCopyPhone(center.phone, e)}
            className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition active:scale-98"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">کپی</span>
          </button>
        ) : (
          <button
            disabled
            className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed"
          >
            <span className="truncate">بدون تلفن</span>
          </button>
        )}

        {/* Map / Route */}
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-blue-50 border border-blue-200/80 hover:bg-blue-100 text-[#0a4c9a] text-xs font-bold transition active:scale-98"
        >
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">مسیریابی</span>
        </a>

        {/* Details / Info Button */}
        <button
          type="button"
          onClick={() => onOpenDetail(center)}
          className="min-h-[42px] px-1 sm:px-2 flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-98 border border-slate-200/90"
          title="مشاهده جزئیات کامل مرکز"
        >
          <Info className="w-3.5 h-3.5 text-[#0a4c9a] shrink-0" />
          <span className="truncate">جزئیات</span>
        </button>
      </div>
    </article>
  );
});
