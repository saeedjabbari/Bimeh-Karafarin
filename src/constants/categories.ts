import React from 'react';
import {
  Grid,
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
  Cross
} from 'lucide-react';

export interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  borderColor: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
  all: {
    label: 'همه',
    icon: Grid,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'آزمایشگاه': {
    label: 'آزمایشگاه',
    icon: FlaskConical,
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'دندانپزشکی': {
    label: 'دندانپزشکی',
    icon: Smile,
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  'بیمارستان': {
    label: 'بیمارستان',
    icon: Building2,
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    borderColor: 'border-rose-200'
  },
  'درمانگاه': {
    label: 'درمانگاه',
    icon: Stethoscope,
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    borderColor: 'border-cyan-200'
  },
  'تصویربرداری': {
    label: 'تصویربرداری',
    icon: Scan,
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    borderColor: 'border-sky-200'
  },
  'فیزیوتراپی': {
    label: 'فیزیوتراپی',
    icon: Activity,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  'داروخانه': {
    label: 'داروخانه',
    icon: Pill,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  'مرکز جراحی محدود': {
    label: 'مرکز جراحی محدود',
    icon: Scissors,
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  'مطب': {
    label: 'مطب',
    icon: UserRound,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    borderColor: 'border-slate-200'
  },
  'پزشکی هسته‌ای': {
    label: 'پزشکی هسته‌ای',
    icon: Atom,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    borderColor: 'border-violet-200'
  },
  'کلینیک': {
    label: 'کلینیک',
    icon: Cross,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    borderColor: 'border-blue-200'
  }
};

export function getCategoryMeta(type: string): CategoryMeta {
  return CATEGORY_CONFIG[type] || {
    label: type,
    icon: Stethoscope,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    borderColor: 'border-slate-200'
  };
}
