import React from 'react';
import { Stethoscope, Bookmark, MapPin, FileText } from 'lucide-react';
import { TabType } from '../types';
import { toFa } from '../utils/persian';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount,
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="منوی ناوبری اصلی"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 px-2">
        {/* Centers */}
        <button
          onClick={() => onTabChange('centers')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition relative ${
            activeTab === 'centers'
              ? 'text-[#0a4c9a] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          {activeTab === 'centers' && (
            <span className="absolute top-1 w-6 h-1 rounded-full bg-[#F15A31]" />
          )}
          <Stethoscope className="w-5 h-5" />
          <span className="text-[11px] mt-1">مراکز</span>
        </button>

        {/* Saved / Bookmarks */}
        <button
          onClick={() => onTabChange('saved')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition relative ${
            activeTab === 'saved'
              ? 'text-[#0a4c9a] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          {activeTab === 'saved' && (
            <span className="absolute top-1 w-6 h-1 rounded-full bg-[#F15A31]" />
          )}
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#F15A31] text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1 tabular-nums border-2 border-white">
                {toFa(savedCount)}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">نشان‌شده‌ها</span>
        </button>

        {/* Streets & Map Hubs */}
        <button
          onClick={() => onTabChange('streets')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition relative ${
            activeTab === 'streets'
              ? 'text-[#0a4c9a] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          {activeTab === 'streets' && (
            <span className="absolute top-1 w-6 h-1 rounded-full bg-[#F15A31]" />
          )}
          <MapPin className="w-5 h-5" />
          <span className="text-[11px] mt-1">مناطق ارومیه</span>
        </button>

        {/* Claim Guide & Sinad */}
        <button
          onClick={() => onTabChange('guide')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition relative ${
            activeTab === 'guide'
              ? 'text-[#0a4c9a] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          {activeTab === 'guide' && (
            <span className="absolute top-1 w-6 h-1 rounded-full bg-[#F15A31]" />
          )}
          <FileText className="w-5 h-5" />
          <span className="text-[11px] mt-1">ثبت خسارت</span>
        </button>
      </div>
    </nav>
  );
};
