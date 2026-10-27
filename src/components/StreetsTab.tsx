import React from 'react';
import { MapPin, ArrowLeft, Navigation, Building2, Stethoscope } from 'lucide-react';
import { toFa } from '../utils/persian';

interface StreetsTabProps {
  streetCounts: Record<string, number>;
  onSelectStreetAndSwitch: (street: string) => void;
}

interface StreetHub {
  name: string;
  desc: string;
  highlights: string[];
}

const HUBS: StreetHub[] = [
  {
    name: 'حسنی',
    desc: 'مهم‌ترین و پرتراکم‌ترین قطب پزشکی و ساختمان‌های پزشکان ارومیه',
    highlights: ['ساختمان‌های لقمان حکیم، اورشاد، نوبل، کالین، باریش', 'بیش از ۴۰ مرکز آزمایشگاه، فیزیوتراپی و دندانپزشکی'],
  },
  {
    name: 'مولوی',
    desc: 'محور بیمارستانی و جراحی تخصصی غرب ارومیه',
    highlights: ['بیمارستان میلاد، مرکز جراحی میلاد نور', 'رادیوتراپی پرتو، کلینیک‌های دندانپزشکی و آزمایشگاه'],
  },
  {
    name: 'کاشانی',
    desc: 'محور درمانی مرکزی و بیمارستان‌های دولتی و آموزشی',
    highlights: ['بیمارستان شهید مطهری، بیمارستان آیت‌الله طالقانی', 'درمانگاه امام علی، آزمایشگاه رویان و آریان'],
  },
  {
    name: 'امام',
    desc: 'خیابان مرکزی با بیمارستان‌ها و مطب‌های دیرینه',
    highlights: ['بیمارستان دکتر صولتی، بیمارستان شفا', 'آزمایشگاه دکتر قوام و مطب‌های دندانپزشکی'],
  },
  {
    name: 'بهشتی',
    desc: 'خیابان شهید بهشتی (دانشکده) با مراکز درمانی مجهز',
    highlights: ['بیمارستان شمس، بیمارستان آذربایجان', 'درمانگاه شبانه‌روزی سلامت'],
  },
  {
    name: 'خان‌باباخان',
    desc: 'کوچه‌های پزشکی پرسابقه و مراکز تشخیصی پیشرفته',
    highlights: ['آزمایشگاه‌های مهر، اسمعیل‌زاده، شمس', 'مراکز رادیولوژی و سونوگرافی'],
  },
  {
    name: 'خیام شمالی',
    desc: 'محور تخصصی تشخیصی و آزمایشگاه‌های مجهز',
    highlights: ['آزمایشگاه دکتر مجید میلانی، آزمایشگاه پاستور', 'مطب‌های تخصصی دندانپزشکی'],
  },
  {
    name: 'فرهنگیان',
    desc: 'مراکز درمانی شهرک کوثر و فرهنگیان ارومیه',
    highlights: ['بیمارستان امید، درمانگاه شبانه‌روزی افرا', 'داروخانه دکتر شقاقی'],
  },
  {
    name: 'ورزش',
    desc: 'محدوده بلوار ورزش و میدان خیرین',
    highlights: ['آزمایشگاه بنیان و پژمان', 'بیمارستان طالقانی (دسترسی ورزشگاه)'],
  },
  {
    name: 'برق',
    desc: 'خیابان سربازان گمنام (برق) و اطراف عمار',
    highlights: ['درمانگاه فارابی، مرکز جراحی تیزرو', 'داروخانه دکتر حسن‌زاده'],
  },
  {
    name: 'رودکی',
    desc: 'مراکز فعال در محدوده رودکی و آزادگان',
    highlights: ['کلینیک دندانپزشکی جم و آراز', 'درمانگاه دکتر میرجعفری'],
  },
];

export const StreetsTab: React.FC<StreetsTabProps> = ({
  streetCounts,
  onSelectStreetAndSwitch,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0a4c9a]" />
          <span>قطب‌های درمانی و خیابان‌های اصلی ارومیه</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          برای دسترسی سریع‌تر، مراکز درمانی شهر ارومیه در خیابان‌های اصلی دسته‌بندی شده‌اند. با انتخاب هر خیابان، لیست مراکز همان محدوده نمایش داده می‌شود.
        </p>
      </div>

      <div className="space-y-3">
        {HUBS.map((hub) => {
          const count = streetCounts[hub.name] || 0;
          return (
            <div
              key={hub.name}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col gap-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0a4c9a] flex items-center justify-center shrink-0 border border-blue-100">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      خیابان {hub.name}
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {hub.desc}
                    </span>
                  </div>
                </div>

                <span className="bg-blue-50 text-[#0a4c9a] text-xs font-bold px-2.5 py-1 rounded-full shrink-0 tabular-nums border border-blue-100">
                  {toFa(count)} مرکز
                </span>
              </div>

              {/* Highlights */}
              <div className="text-[11.5px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1">
                {hub.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onSelectStreetAndSwitch(hub.name)}
                  className="flex-1 min-h-[40px] rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <span>مشاهده {toFa(count)} مرکز این خیابان</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('مراکز پزشکی خیابان ' + hub.name + ' ارومیه')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition"
                  title="موقعیت در گوگل مپ"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#0a4c9a]" />
                  <span>نقشه</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
