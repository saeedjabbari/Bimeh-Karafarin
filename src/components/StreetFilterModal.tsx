import React, { useState } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
import { StreetPinterestBoard } from './StreetPinterestBoard';
import { toFa } from '../utils/persian';

interface StreetFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStreet: string;
  onSelectStreet: (street: string) => void;
  streetCounts: Record<string, number>;
  totalCenters: number;
}

export const StreetFilterModal: React.FC<StreetFilterModalProps> = ({
  isOpen,
  onClose,
  selectedStreet,
  onSelectStreet,
  streetCounts,
  totalCenters,
}) => {
  const [streetQuery, setStreetQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#f8fafc] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl z-10 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F15A31] flex items-center justify-center shrink-0 border border-orange-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  فیلتر خیابان‌های ارومیه
                </h2>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-95"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search */}
        <div className="p-3 bg-white/70 border-b border-slate-200/60 shrink-0">
          <input
            type="text"
            value={streetQuery}
            onChange={(e) => setStreetQuery(e.target.value)}
            placeholder="جستجوی نام خیابان (مثلاً حسنی، مولوی، بهشتی)..."
            className="w-full h-10 bg-white text-xs rounded-xl px-3.5 border border-slate-200 outline-none focus:border-[#0a4c9a] focus:ring-1 focus:ring-[#0a4c9a]/30 transition"
          />
        </div>

        {/* Pinterest Board Container */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 w-full overflow-x-hidden">
          <StreetPinterestBoard
            selectedStreet={selectedStreet}
            onSelectStreet={onSelectStreet}
            streetCounts={streetCounts}
            totalCenters={totalCenters}
            searchQuery={streetQuery}
            onClose={onClose}
          />
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between gap-2.5 shrink-0">
          <div className="min-w-0 flex items-center gap-1.5 text-xs">
            {selectedStreet ? (
              <span className="text-slate-600 truncate">
                فیلتر فعال: <strong className="text-[#0a4c9a]">خیابان {selectedStreet}</strong>{' '}
                <span className="tabular-nums">({toFa(streetCounts[selectedStreet] || 0)} مرکز)</span>
              </span>
            ) : (
              <span className="text-slate-500">تمام خیابان‌ها در حال نمایش هستند</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedStreet && (
              <button
                type="button"
                onClick={() => {
                  onSelectStreet('');
                  onClose();
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition active:scale-95"
              >
                حذف فیلتر
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white text-xs font-bold transition shadow-xs active:scale-95"
            >
              مشاهده مراکز
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
