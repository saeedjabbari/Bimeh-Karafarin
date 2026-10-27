import React, { useState } from 'react';
import { X, MapPin, Check, Search } from 'lucide-react';
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

  const sortedStreets = Object.keys(streetCounts).sort(
    (a, b) => streetCounts[b] - streetCounts[a]
  );

  const filteredStreets = sortedStreets.filter((s) =>
    s.includes(streetQuery.trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl z-10 border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0a4c9a]" />
            <h2 className="text-base font-bold text-slate-900">
              فیلتر مراکز بر اساس خیابان / منطقه
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={streetQuery}
              onChange={(e) => setStreetQuery(e.target.value)}
              placeholder="جستجوی خیابان (مثلاً حسنی، مولوی، بهشتی)..."
              className="w-full h-9 bg-white text-xs rounded-xl pr-9 pl-3 border border-slate-200 outline-none focus:border-[#0a4c9a]"
            />
          </div>
        </div>

        {/* Street List */}
        <div className="p-3 overflow-y-auto space-y-1 flex-1">
          {/* All Streets option */}
          <button
            onClick={() => {
              onSelectStreet('');
              onClose();
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition ${
              selectedStreet === ''
                ? 'bg-[#0a4c9a] text-white'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>همه مناطق و خیابان‌های ارومیه</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums opacity-80">{toFa(totalCenters)} مرکز</span>
              {selectedStreet === '' && <Check className="w-4 h-4" />}
            </div>
          </button>

          {/* Individual Streets */}
          {filteredStreets.map((st) => {
            const count = streetCounts[st];
            const isSelected = selectedStreet === st;
            return (
              <button
                key={st}
                onClick={() => {
                  onSelectStreet(st);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-[#0a4c9a] text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>خیابان {st}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {toFa(count)} مرکز
                  </span>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          {selectedStreet && (
            <button
              onClick={() => {
                onSelectStreet('');
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              حذف فیلتر خیابان
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#0a4c9a] hover:bg-blue-900 text-white text-xs font-bold transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
