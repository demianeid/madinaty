"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BeforeAfterSlider } from "@/components/before-after-slider";

export default function HomePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100" dir="rtl">
      <Header />

      <main className="flex-1">
        {/* ========================================================
            HERO SECTION: Background Artwork Owned Directly by Hero
        ======================================================== */}
        <section
          className="relative overflow-hidden min-h-[85vh] lg:min-h-[92vh] flex items-center bg-cover bg-center lg:bg-[center_right] bg-no-repeat pt-28 sm:pt-32 lg:pt-36 pb-24 sm:pb-32 lg:pb-40"
          style={{
            backgroundImage: "url('/images/hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Right-side gradient overlay in RTL: ensures crisp contrast for Arabic text and CTA while keeping smartphone and city clear on the left */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to left, rgba(4, 27, 51, 0.88) 0%, rgba(6, 40, 73, 0.72) 35%, rgba(6, 40, 73, 0.35) 65%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          {/* Mobile supplementary readability scrim */}
          <div
            className="absolute inset-0 sm:hidden bg-[#041b33]/55 pointer-events-none"
            aria-hidden="true"
          />

          {/* Bottom Wave Curve: Smooth layered SVG wave matching navy (#041b33 / #062849) & teal (#0e7490 / #14b8a6) palette */}
          <div
            className="absolute bottom-0 inset-x-0 w-full overflow-hidden leading-none pointer-events-none z-20"
            aria-hidden="true"
          >
            <svg
              className="relative block w-full h-16 sm:h-24 lg:h-32"
              viewBox="0 0 1440 160"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="heroWaveNavy" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#041b33" />
                  <stop offset="50%" stopColor="#062849" />
                  <stop offset="100%" stopColor="#0B1E38" />
                </linearGradient>
                <linearGradient id="heroWaveTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0e7490" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Layer 1: Soft Teal Wave Accent */}
              <path
                d="M0,90 C320,135 520,35 840,95 C1120,145 1320,65 1440,90 L1440,160 L0,160 Z"
                fill="url(#heroWaveTeal)"
              />

              {/* Layer 2: Deep Navy Base Wave transitioning into next section */}
              <path
                d="M0,115 C360,155 640,75 1000,125 C1240,155 1380,120 1440,130 L1440,160 L0,160 Z"
                fill="url(#heroWaveNavy)"
              />
            </svg>
          </div>

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 w-full">
              {/* Content Column: Aligned on the RIGHT side in RTL on desktop */}
              <div className="col-span-1 lg:col-span-7 xl:col-span-6 text-right relative">
                {/* Decorative teal/blue glow behind heading */}
                <div
                  className="absolute -top-12 -right-8 w-96 h-56 bg-gradient-to-l from-[#22d3ee]/20 via-[#0d9488]/15 to-transparent blur-3xl rounded-full pointer-events-none -z-10"
                  aria-hidden="true"
                />

                {/* Main Headline (H1): "مدينتي" in bold crisp white */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
                  مدينتي
                </h1>

                {/* Subtitle (H2): "مدينة أذكي .. لحياة أفضل" in bright cyan/teal */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-[#22d3ee] to-[#2dd4bf] mb-5 leading-snug drop-shadow-[0_2px_12px_rgba(34,211,238,0.3)]">
                  مدينة أذكي .. لحياة أفضل
                </h2>

                {/* Description Text: Two concise lines in soft light gray/white */}
                <p className="text-base sm:text-lg lg:text-xl text-[#e2e8f0] leading-relaxed max-w-lg mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                  منصة رقمية متكاملة لخدمات مدينتي.
                  <br />
                  للتواصل بسهولة، وحل المشكلات بكفاءة.
                </p>

                {/* Primary CTA Button: Rounded pill button in teal/cyan with white text, subtle shadow/glow & hover feedback */}
                <div>
                  <Link
                    href="/reports/new"
                    className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#0d9488] to-[#0891b2] hover:from-[#0f766e] hover:to-[#0e7490] px-8 py-4 text-base sm:text-lg font-bold text-white shadow-[0_4px_22px_rgba(13,148,136,0.45)] hover:shadow-[0_6px_28px_rgba(8,145,178,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center cursor-pointer min-w-[170px]"
                  >
                    <span>ابدأ الآن</span>
                    <span className="text-xl transition-transform duration-200 ease-out group-hover:-translate-x-1.5" aria-hidden="true">
                      ←
                    </span>
                  </Link>
                </div>
              </div>

              {/* Spacer on the LEFT in RTL: leaves the smartphone mockup and city buildings completely visible */}
              <div className="hidden lg:block lg:col-span-5 xl:col-span-6 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* ========================================================
            HOW IT WORKS: 3-Step Lifecycle – Staircase Layout
        ======================================================== */}
        <section
          id="how-it-works"
          className="bg-transparent relative"
          style={{ paddingTop: "5rem", paddingBottom: "9rem" }}
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 bg-teal-950/70 border border-teal-500/30 px-3.5 py-1 rounded-full mb-3 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                آلية العمل الذكية
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-sm">
                كيف تعمل منصة مدينتي؟
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                من لحظة التقاطك للصورة وحتى إتمام الإصلاح الميداني، تجربة شفافة وموثقة خطوة بخطوة
              </p>
            </div>

            {/* ── ARCH-CARD ROW ──
                Desktop/tablet: 3 cards side by side with staircase offsets.
                RTL order ⟹ Card 01 at right edge (translateY 0),
                Card 02 centre (translateY 50px), Card 03 left edge (translateY 100px).
                Mobile: stacked vertically, no vertical offset.
                Each card: arched image panel (left side, convex right edge) +
                large circular gradient step badge overlapping the arch boundary.
            */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">

              {/* ── CARD 01 ── */}
              <div
                className="group relative flex flex-row-reverse rounded-[22px] border border-slate-200/70 bg-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.10)] hover:shadow-[0_12px_40px_rgba(13,148,136,0.20)] hover:-translate-y-2 transition-all duration-300 ease-out overflow-hidden text-right
                           md:translate-y-0
                           motion-reduce:transition-none"
                style={{ minHeight: '230px' }}
              >
                {/* Image panel — left side (flex-row-reverse puts first child on left in RTL) */}
                <div
                  className="relative w-[42%] shrink-0 overflow-hidden"
                  style={{ borderRadius: '0 68px 68px 0' }}
                >
                  <Image
                    src="/images/madinaty/step-01-report-problem.jpg"
                    alt="رصد وتحديد الموقع"
                    fill
                    sizes="(max-width: 768px) 42vw, 14vw"
                    className="object-cover object-center group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                  />
                  {/* Subtle gradient scrim so arch boundary blends smoothly */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10 pointer-events-none" />
                </div>

                {/* Large circular gradient step badge — overlaps arch boundary */}
                <div
                  className="absolute top-4 z-20 flex items-center justify-center rounded-full text-white font-black text-xl shadow-[0_4px_16px_rgba(13,148,136,0.45)] border-2 border-white/50"
                  style={{
                    left: 'calc(42% - 28px)',
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                  }}
                >
                  01
                </div>

                {/* Text content — right side */}
                <div className="flex-1 px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-[#0D9488] bg-teal-50 border border-teal-200/70 rounded-md px-2 py-0.5 mb-2.5">
                      رصد وتحديد الموقع
                    </span>
                    <h3 className="text-base font-bold text-[#142D4E] group-hover:text-[#2563EB] transition-colors leading-snug mb-2">
                      1. التقاط المشكلة وتحديد الموقع
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      التقط صورة العطل أو المشكلة، وسيقوم الذكاء الاصطناعي باقتراح التصنيف المناسب وتحديد الموقع الجغرافي الدقيق على الخريطة تلقائياً.
                    </p>
                  </div>

                  {/* Tag pills */}
                  <div className="mt-4 pt-3 border-t border-slate-100/80 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#142D4E] bg-slate-100 border border-slate-200/70 rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      تحديد جغرافي
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-md px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                      AI
                    </span>
                  </div>
                </div>
              </div>

              {/* ── CARD 02 ── */}
              <div
                className="group relative flex flex-row-reverse rounded-[22px] border border-slate-200/70 bg-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.10)] hover:shadow-[0_12px_40px_rgba(13,148,136,0.20)] hover:-translate-y-2 transition-all duration-300 ease-out overflow-hidden text-right
                           md:translate-y-[50px]
                           motion-reduce:transition-none"
                style={{ minHeight: '230px' }}
              >
                <div
                  className="relative w-[42%] shrink-0 overflow-hidden"
                  style={{ borderRadius: '0 68px 68px 0' }}
                >
                  <Image
                    src="/images/madinaty/step-02-dispatch-field-team.jpg"
                    alt="التوجيه والتحرك الميداني"
                    fill
                    sizes="(max-width: 768px) 42vw, 14vw"
                    className="object-cover object-center group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10 pointer-events-none" />
                </div>

                <div
                  className="absolute top-4 z-20 flex items-center justify-center rounded-full text-white font-black text-xl shadow-[0_4px_16px_rgba(13,148,136,0.45)] border-2 border-white/50"
                  style={{
                    left: 'calc(42% - 28px)',
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                  }}
                >
                  02
                </div>

                <div className="flex-1 px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-[#0D9488] bg-teal-50 border border-teal-200/70 rounded-md px-2 py-0.5 mb-2.5">
                      التوجيه والتحرك الميداني
                    </span>
                    <h3 className="text-base font-bold text-[#142D4E] group-hover:text-[#2563EB] transition-colors leading-snug mb-2">
                      2. التوجيه الآلي والمباشرة الميدانية
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      يصل البلاغ فوراً إلى طاقم الهيئة البلدية المسؤولة، حيث يبدأ الفريق الفني التحرك الميداني مع احتساب مؤشر سرعة الاستجابة المعتمد.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100/80 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-[#047857]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      استجابة فورية
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#142D4E] bg-slate-100 border border-slate-200/70 rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      توجيه ذكي
                    </span>
                  </div>
                </div>
              </div>

              {/* ── CARD 03 ── */}
              <div
                className="group relative flex flex-row-reverse rounded-[22px] border border-slate-200/70 bg-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.10)] hover:shadow-[0_12px_40px_rgba(13,148,136,0.20)] hover:-translate-y-2 transition-all duration-300 ease-out overflow-hidden text-right
                           md:translate-y-[100px]
                           motion-reduce:transition-none"
                style={{ minHeight: '230px' }}
              >
                <div
                  className="relative w-[42%] shrink-0 overflow-hidden"
                  style={{ borderRadius: '0 68px 68px 0' }}
                >
                  <Image
                    src="/images/madinaty/step-03-inspection-completion.jpg"
                    alt="المعاينة والتوثيق النهائي"
                    fill
                    sizes="(max-width: 768px) 42vw, 14vw"
                    className="object-cover object-center group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10 pointer-events-none" />
                  {/* Completion badge */}
                  <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5]/95 backdrop-blur-md border border-[#A7F3D0] px-2 py-0.5 text-[10px] font-bold text-[#047857] shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                    تم الإنجاز ✓
                  </div>
                </div>

                <div
                  className="absolute top-4 z-20 flex items-center justify-center rounded-full text-white font-black text-xl shadow-[0_4px_16px_rgba(13,148,136,0.45)] border-2 border-white/50"
                  style={{
                    left: 'calc(42% - 28px)',
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #22d3ee 0%, #0d9488 100%)',
                  }}
                >
                  03
                </div>

                <div className="flex-1 px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-[#0D9488] bg-teal-50 border border-teal-200/70 rounded-md px-2 py-0.5 mb-2.5">
                      المعاينة والتوثيق النهائي
                    </span>
                    <h3 className="text-base font-bold text-[#142D4E] group-hover:text-[#2563EB] transition-colors leading-snug mb-2">
                      3. التوثيق الفوتوغرافي والتقييم
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      لا يُغلق البلاغ إلا بصورة إثبات الإنجاز. تتلقى إشعاراً فورياً، مع حق تقييم جودة الخدمة أو تقديم طعن رسمي خلال 7 أيام إذا لزم الأمر.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100/80 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#142D4E] bg-slate-100 border border-slate-200/70 rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      توثيق بالصور
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0369A1] bg-[#E0F2FE] border border-[#BAE6FD] rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-[#0369A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      تقييم المواطن
                    </span>
                  </div>
                </div>
              </div>

            </div>{/* end arch-card grid */}
          </div>
        </section>

        {/* ========================================================
            CATEGORIES: 6 Real-World Civic Domains
        ======================================================== */}
        <section id="categories" className="py-20 bg-transparent relative">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-blue-950/70 border border-blue-500/30 px-3.5 py-1 rounded-full mb-3 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                تغطية شاملة للمدينة
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                مجالات البلاغات المشمولة
              </h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                يتم توجيه كل بلاغ تلقائياً إلى الفريق الميداني المسؤول داخل الجهة المختصة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {[
                {
                  title: "حفر وتصدعات الطرق",
                  badge: "أعمال الطرق",
                  desc: "معالجة هبوط الأسفلت، صيانة الأرصفة وتأمين حركة المشاة والمركبات.",
                  image: "/images/madinaty/category-01-road-repair.jpg",
                },
                {
                  title: "أعطال إنارة الشوارع",
                  badge: "الإنارة العامة",
                  desc: "إصلاح أعمدة الإنارة المطفأة وتأمين الكابلات الكهربائية السائبة.",
                  image: "/images/madinaty/category-02-street-lighting.jpg",
                },
                {
                  title: "تراكم النفايات والحاويات",
                  badge: "النظافة والبيئة",
                  desc: "تفريغ الحاويات الممتلئة وتنظيف المكبات العشوائية ونقل المخلفات.",
                  image: "/images/madinaty/category-03-waste-management.jpg",
                },
                {
                  title: "تسربات المياه والصرف",
                  badge: "المياه والصرف",
                  desc: "إصلاح الكسور في الشبكات العامة وشفط تجمعات المياه السائبة.",
                  image: "/images/madinaty/category-04-water-sewage-repair.jpg",
                },
                {
                  title: "صيانة الحدائق العامة",
                  badge: "الحدائق والمرافق",
                  desc: "تقليم الأشجار الخطرة، إصلاح ألعاب الأطفال، والعناية بالمرافق الخضراء.",
                  image: "/images/madinaty/category-05-park-maintenance.jpg",
                },
                {
                  title: "مخالفات البناء والإشغالات",
                  badge: "التراخيص والإشغالات",
                  desc: "متابعة إشغالات الأرصفة العامة ومخالفات الهدم والبناء غير المرخصة.",
                  image: "/images/madinaty/category-06-construction-inspection.jpg",
                },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href="/reports/new"
                  className="group flex flex-col h-full rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-[#0D9488]/40 hover:shadow-xl hover:shadow-[#0D9488]/10 hover:-translate-y-1.5 transition-all duration-300 ease-out overflow-hidden text-right cursor-pointer"
                >
                  {/* Media Frame */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent pointer-events-none" />
                    {/* Floating Frosted Glass Overlay Badge */}
                    <div className="absolute top-3.5 right-3.5 z-10 inline-flex items-center rounded-full backdrop-blur-md bg-white/92 px-3 py-1 text-xs font-bold text-emerald-900 border border-white/60 shadow-sm">
                      {item.badge}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-[#142D4E] group-hover:text-[#2563EB] transition-colors mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                      {item.desc}
                    </p>

                    {/* Action Link with animated left-pointing arrow */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-[#2563EB] group-hover:text-[#1D4ED8] transition-colors inline-flex items-center gap-1.5">
                        <span>تقديم بلاغ</span>
                        <svg
                          className="w-4 h-4 transition-transform duration-300 ease-out group-hover:-translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
                        فوري ومباشر
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            BEFORE & AFTER PHOTO VERIFICATION: Interactive Slider
        ======================================================== */}
        <section id="showcase" className="py-16 sm:py-20 bg-transparent relative">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 bg-teal-950/70 border border-teal-500/30 px-3.5 py-1 rounded-full mb-3 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                التوثيق الميداني المعتمد
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                شفافية الإنجاز: قبل وبعد الإصلاح
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300">
                إثبات مصور حقيقي لكل بلاغ من لحظة تسجيله وحتى اعتماده الميداني
              </p>
            </div>

            {/* Interactive Before/After Comparison Card */}
            <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden transition-all">
              {/* Interactive Image Frame */}
              <BeforeAfterSlider
                beforeImage="/images/showcase-before.jpg"
                afterImage="/images/showcase-after.jpg"
                beforeAlt="حالة الموقع قبل الإصلاح - رصد هبوط أسفلتي"
                afterAlt="حالة الموقع بعد الإصلاح والاعتماد - إعادة السفلتة والدمك"
                beforeLabel="قبل الإصلاح"
                afterLabel="بعد الإصلاح والاعتماد"
                initialPosition={50}
              />

              {/* Card Metadata Footer */}
              <div className="p-4 sm:p-5 bg-white border-t border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                {/* Titles & Location */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-[#142D4E] text-sm sm:text-base">
                      رصد هبوط أسفلتي
                    </span>
                    <span className="text-slate-400 font-bold">←</span>
                    <span className="font-bold text-[#047857] text-sm sm:text-base">
                      إعادة السفلتة والدمك
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <svg className="w-3.5 h-3.5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      شارع الأمل، المجاورة 4
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-medium">معتمد من هيئة الأشغال</span>
                  </div>
                </div>

                {/* Report Code & Duration Badge */}
                <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-[#CBD5E1] px-2.5 py-1 rounded-md">
                    #MD-2026-X891
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-md shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                    <span>مكتمل (22 ساعة)</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================
            CIVIC FAQ ACCORDION SECTION
        ======================================================== */}
        <section id="faq" className="py-20 bg-transparent relative">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-blue-950/70 border border-blue-500/30 px-3.5 py-1 rounded-full mb-3 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                إجابات سريعة
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                الأسئلة الشائعة حول المنصة
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                كل ما تحتاج معرفته عن تسجيل البلاغات ومتابعتها وحماية خصوصيتك
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "هل خدمة تسجيل البلاغات ومتابعتها مجانية؟",
                  a: "نعم، كافة خدمات منصة مدينتي متاحة مجاناً لجميع المواطنين والمقيمين والزوار على مدار 24 ساعة دون أي رسوم.",
                },
                {
                  q: "هل تظهر بياناتي الشخصية للعامة عند تقديم بلاغ؟",
                  a: "أبداً. تلتزم المنصة بأعلى معايير الخصوصية؛ يُعرض فقط الرمز المرجعي ونوع المشكلة والموقع على الخريطة لحماية بياناتك وهويتك.",
                },
                {
                  q: "ماذا يحدث إذا تم إغلاق البلاغ دون حل المشكلة بالشكل المطلوب؟",
                  a: "يحق لك خلال 7 أيام من إغلاق البلاغ تقديم 'طعن رسمي' بضغطة زر مع كتابة السبب، وسيتم تحويل البلاغ لإعادة الفحص والرقابة الإدارية.",
                },
                {
                  q: "كيف أتتبع بلاغي إذا لم يكن لدي حساب؟",
                  a: "يمكنك استخدام صندوق 'الاستعلام عن بلاغ' الموجود في أعلى الصفحة الرئيسية عبر إدخال الرمز المرجعي العام (مثل MD-XXXX-XXXX) للاطلاع على آخر حالة معتمدة.",
                },
                {
                  q: "ما هي المدة الزمنية المتوقعة لمباشرة ومعالجة البلاغ؟",
                  a: "تخضع البلاغات لعدادات زمنية محددة (SLA) بحسب درجة الخطورة؛ تبدأ الفرق الميدانية فحص المشكلات العاجلة والخطرة خلال ساعات من تسجيل البلاغ.",
                },
              ].map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#CBD5E1] bg-white transition-all overflow-hidden shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-5 text-right font-bold text-sm sm:text-base text-[#142D4E] hover:text-[#2563EB] transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-mono transition-transform ${isOpen ? "rotate-180 bg-[#EFF6FF] text-[#2563EB]" : "text-slate-500"}`}>
                        ↓
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-[#F1F5F9]/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================
            CLOSING COMMUNITY CTA
        ======================================================== */}
        <section className="py-20 bg-transparent relative">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="rounded-3xl bg-white/95 backdrop-blur-md border border-white/40 p-8 sm:p-12 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#142D4E]">
                رأيت عطلاً أو مشكلة في حيك اليوم؟
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                لا تتردد، بلاغك المباشر يدعم جهود الهيئات البلدية في رصد الأعطال وصيانة المرافق العامة بكفاءة وسرعة.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all text-center cursor-pointer"
                >
                  سجّل بلاغك في دقيقة واحدة
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 px-8 py-3.5 text-base font-semibold text-[#142D4E] transition-colors text-center cursor-pointer"
                >
                  متابعة بلاغاتي السابقة
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
