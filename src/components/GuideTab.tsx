import React from 'react';
import {
  ExternalLink,
  FileText,
  CheckCircle,
  HelpCircle,
  Building,
  Shield,
  PhoneCall,
  Clock,
  CreditCard,
  FileCheck
} from 'lucide-react';

const PORTAL_URL = 'https://sinad.karafarin-insurance.ir/DarmanAfzar.Customer/index.html';

export const GuideTab: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Hero Portal Card */}
      <div className="bg-gradient-to-br from-[#0a4c9a] to-[#1d6fd1] rounded-2xl p-5 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold leading-tight">
              پورتال ثبت و پیگیری مدارک درمان بیمه کارآفرین
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              سامانه سیناد (درمان‌افزار مشتریان)
            </p>
          </div>
        </div>

        <p className="text-xs text-blue-100/90 leading-relaxed">
          اگر مرکز درمانی مورد نظر شما طرف قرارداد آنلاین نیست، می‌توانید هزینه‌ها را شخصاً پرداخت کرده و با بارگذاری مدارک در سامانه، خسارت درمان را مستقیماً در حساب بانکی خود دریافت کنید.
        </p>

        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-white text-[#0a4c9a] hover:bg-blue-50 font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition active:scale-98"
        >
          <span>ورود به سامانه درمان‌افزار کارآفرین</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Steps to Claim */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0a4c9a]" />
          <span>مراحل دریافت خسارت از پذیرش تا پرداخت</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-[#0a4c9a] text-white flex items-center justify-center font-bold text-xs shrink-0">
              ۱
            </span>
            <div>
              <strong className="text-slate-900 block font-bold">مراجعه و دریافت فاکتور معتبر:</strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                هنگام مراجعه به مرکز غیر طرف قرارداد، صورتحساب ممهور به مهر مرکز و دستور پزشک را دریافت فرمایید.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-[#0a4c9a] text-white flex items-center justify-center font-bold text-xs shrink-0">
              ۲
            </span>
            <div>
              <strong className="text-slate-900 block font-bold">ورود به پورتال سیناد:</strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                با کدملی بیمه‌شده اصلی وارد سامانه شوید و گزینه «ثبت پرونده خسارت جدید» را انتخاب کنید.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-[#0a4c9a] text-white flex items-center justify-center font-bold text-xs shrink-0">
              ۳
            </span>
            <div>
              <strong className="text-slate-900 block font-bold">بارگذاری تصاویر و شماره شبا:</strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                عکس‌های واضح و خوانا از مدارک را بارگذاری نموده و شماره شبای بانکی را تأیید کنید.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              ۴
            </span>
            <div>
              <strong className="text-slate-900 block font-bold">رسیدگی و واریز وجه:</strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                کارشناسان بیمه کارآفرین پرونده را بررسی کرده و مبلغ خسارت طبق سقف قرارداد به حسابتان واریز می‌شود.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist of Required Documents */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <span>مدارک لازم برای بارگذاری در سامانه</span>
        </h3>

        <ul className="space-y-2 text-xs text-slate-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>اصل دستور پزشک معالج با ذکر نام بیمار، تاریخ و مهر پزشک</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>اصل صورتحساب رسمی یا قبض صندوق با مهر و امضای مرکز درمانی</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>برای خدمات پاراکلینیکی (آزمایش، سونوگرافی، MRI، سی‌تی اسکن): برگه گزارش یا جواب نتیجه</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>برای خدمات دندانپزشکی: برگه معاینه دندانپزشک همراه با گرافی قبل و بعد درمان (در صورت درخواست بیمه)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>کارت ملی بیمار و شماره شبای بانکی به نام بیمه‌شده اصلی</span>
          </li>
        </ul>
      </div>

      {/* Organization info & footer links */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Building className="w-4 h-4 text-[#F15A31]" />
          <span>شرکت طرف قرارداد بیمه: گروه صنعتی اسپوتا</span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-slate-500">
          این راهنما برای تسهیل امور درمانی همکاران گرامی گروه صنعتی اسپوتا در شهر ارومیه تهیه و به‌روزرسانی شده است.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <a
            href="https://spootaholding.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0a4c9a] hover:underline font-bold inline-flex items-center gap-1"
          >
            <span>وب‌سایت گروه صنعتی اسپوتا</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-300">·</span>
          <a
            href="https://www.karafarin-insurance.ir/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0a4c9a] hover:underline font-bold inline-flex items-center gap-1"
          >
            <span>پرتال رسمی بیمه کارآفرین</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
