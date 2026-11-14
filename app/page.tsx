"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function HomePage() {
  const router = useRouter();
  const [trackingRef, setTrackingRef] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingRef.trim()) {
      router.push(`/track?ref=${encodeURIComponent(trackingRef.trim().toUpperCase())}`);
    }
  };

  const handleSampleTrack = () => {
    setTrackingRef("MD-2026-X891");
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800" dir="rtl">
      <Header />

      <main className="flex-1">
        {/* ========================================================
            HERO SECTION: Focused & Centered
        ======================================================== */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#ecfdf5]/80 via-white to-[#f8fafc] pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/70">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf5] border border-[#dce8e4] px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#007766] mb-6 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-[#007766] animate-pulse" />
                المنصة البلدية الذكية لصوت المواطن
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0f172a] leading-[1.25]">
                معاً لمدينة أفضل، أنظف، <br className="hidden sm:inline" />
                <span className="text-[#007766]">وأكثر أماناً</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                أبلغ عن مشكلات الطرق، النظافة، أو الإنارة في حيك وتابع خطوات المعالجة الميدانية خطوة بخطوة مع توثيق مصور معتمد لكل مرحلة إصلاح.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-lg bg-[#007766] hover:bg-[#005f52] px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:shadow-civic-1 transition-all text-center cursor-pointer"
                >
                  تقديم بلاغ جديد
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-8 py-3.5 text-base font-semibold text-slate-700 transition-colors text-center cursor-pointer shadow-xs"
                >
                  تسجيل الدخول للمتابعة
                </Link>
              </div>

              {/* Quick Reference Tracker */}
              <div id="track" className="mt-10 max-w-lg mx-auto rounded-xl border border-slate-200/90 bg-white p-4 shadow-civic-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#007766]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    استعلام سريع عن بلاغ
                  </span>
                  <button
                    type="button"
                    onClick={handleSampleTrack}
                    className="text-[11px] font-semibold text-[#007766] hover:text-[#005f52] hover:underline cursor-pointer"
                  >
                    تجربة رمز نموذجي
                  </button>
                </div>
                <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={trackingRef}
                    onChange={(e) => setTrackingRef(e.target.value)}
                    placeholder="MD-XXXX-XXXX"
                    className="w-full uppercase font-mono tracking-wider rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-center focus:border-[#007766] focus:outline-none focus:ring-2 focus:ring-[#007766]/20 bg-[#f8fafc]"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto whitespace-nowrap rounded-lg bg-[#0f172a] hover:bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    تتبع الحالة
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-slate-500 font-mono text-center">
                  أدخل الرمز المرجعي العام للتحقق من الحالة وتفاصيل المعالجة دون الحاجة لحساب
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            HOW IT WORKS: 3-Step Lifecycle
        ======================================================== */}
        <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/70">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block text-xs font-bold text-[#007766] bg-[#ecfdf5] px-3.5 py-1 rounded-full mb-3">
                آلية العمل الذكية
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#0f172a]">
                كيف تعمل منصة مدينتي؟
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                من لحظة التقاطك للصورة وحتى إتمام الإصلاح الميداني، تجربة شفافة وموثقة خطوة بخطوة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-8 text-right relative group hover:border-[#007766]/50 hover:shadow-civic-2 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#007766] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-300 group-hover:text-[#007766] transition-colors">
                    01
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  1. التقاط المشكلة وتحديد الموقع
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  التقط صورة العطل أو المشكلة، وسيقوم الذكاء الاصطناعي باقتراح التصنيف المناسب وتحديد الموقع الجغرافي الدقيق على الخريطة تلقائياً.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-8 text-right relative group hover:border-[#007766]/50 hover:shadow-civic-2 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#007766] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-300 group-hover:text-[#007766] transition-colors">
                    02
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  2. التوجيه الآلي والمباشرة الميدانية
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  يصل البلاغ فوراً إلى طاقم الهيئة البلدية المسؤولة، حيث يبدأ الفريق الفني التحرك الميداني مع احتساب مؤشر سرعة الاستجابة المعتمد.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-8 text-right relative group hover:border-[#007766]/50 hover:shadow-civic-2 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#007766] group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-300 group-hover:text-[#007766] transition-colors">
                    03
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  3. التوثيق الفوتوغرافي والتقييم
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  لا يُغلق البلاغ إلا بصورة إثبات الإنجاز. تتلقى إشعاراً فورياً، مع حق تقييم جودة الخدمة أو تقديم طعن رسمي خلال 7 أيام إذا لزم الأمر.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            CATEGORIES WITH CRISP PROFESSIONAL SVG ICONS
        ======================================================== */}
        <section id="categories" className="py-20 bg-[#f8fafc] border-b border-slate-200/70">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block text-xs font-bold text-[#007766] bg-[#ecfdf5] px-3.5 py-1 rounded-full mb-3">
                تغطية شاملة للمدينة
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                مجالات البلاغات المشمولة
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                يتم توجيه كل بلاغ تلقائياً إلى الفريق الميداني المسؤول داخل الجهة المختصة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "حفر وتصدعات الطرق",
                  desc: "معالجة هبوط الأسفلت، صيانة الأرصفة وتأمين حركة المشاة والمركبات.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M4 5h16M9 5v14M15 5v14" />
                    </svg>
                  ),
                },
                {
                  title: "أعطال إنارة الشوارع",
                  desc: "إصلاح أعمدة الإنارة المطفأة وتأمين الكابلات الكهربائية السائبة.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                },
                {
                  title: "تراكم النفايات والحاويات",
                  desc: "تفريغ الحاويات الممتلئة وتنظيف المكبات العشوائية ونقل المخلفات.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                },
                {
                  title: "تسربات المياه والصرف",
                  desc: "إصلاح الكسور في الشبكات العامة وشفط تجمعات المياه السائبة.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ),
                },
                {
                  title: "صيانة الحدائق العامة",
                  desc: "تقليم الأشجار الخطرة، إصلاح ألعاب الأطفال، والعناية بالمرافق الخضراء.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ),
                },
                {
                  title: "مخالفات البناء والإشغالات",
                  desc: "متابعة إشغالات الأرصفة العامة ومخالفات الهدم والبناء غير المرخصة.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ),
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-white p-6 hover:border-[#007766]/50 hover:shadow-civic-2 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#ecfdf5] text-[#007766] flex items-center justify-center mb-4 group-hover:bg-[#007766] group-hover:text-white transition-colors">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#007766] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            BEFORE & AFTER PHOTO VERIFICATION: Compact & Simplified
        ======================================================== */}
        <section id="showcase" className="py-12 sm:py-16 bg-white border-b border-slate-200/70">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            
            {/* Compact Header */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007766] bg-[#ecfdf5] border border-[#dce8e4] px-3 py-0.5 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#007766]" />
                التوثيق الميداني المعتمد
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a]">
                شفافية الإنجاز: قبل وبعد الإصلاح
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                إثبات مصور حقيقي لكل بلاغ من لحظة تسجيله وحتى اعتماده الميداني
              </p>
            </div>

            {/* Compact 2-column image comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Before Card */}
              <div className="rounded-xl border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <Image
                    src="/images/showcase-before.jpg"
                    alt="حالة الموقع قبل الإصلاح"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                    قبل الإصلاح
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">رصد هبوط أسفلتي</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">شارع الأمل، المجاورة 4</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    #MD-2026-X891
                  </span>
                </div>
              </div>

              {/* After Card */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/20 overflow-hidden shadow-xs hover:border-[#007766] transition-colors">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <Image
                    src="/images/showcase-after.jpg"
                    alt="حالة الموقع بعد الإصلاح"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-[#007766] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                    <span>✓</span>
                    <span>بعد الإصلاح والاعتماد</span>
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#007766]">إعادة السفلتة والدمك</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">معتمد من هيئة الأشغال</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#007766] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    مكتمل (22 ساعة)
                  </span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================
            CIVIC FAQ ACCORDION SECTION
        ======================================================== */}
        <section id="faq" className="py-20 bg-[#f8fafc] border-b border-slate-200/70">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold text-[#007766] bg-[#ecfdf5] px-3.5 py-1 rounded-full mb-3">
                إجابات سريعة
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                الأسئلة الشائعة حول المنصة
              </h2>
              <p className="mt-2 text-sm text-slate-600">
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
                    className="rounded-xl border border-slate-200 bg-white transition-all overflow-hidden shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-5 text-right font-bold text-sm sm:text-base text-slate-900 hover:text-[#007766] transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-mono transition-transform ${isOpen ? "rotate-180 bg-[#ecfdf5] text-[#007766]" : "text-slate-500"}`}>
                        ↓
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-[#f8fafc]/50">
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
        <section className="py-16 bg-white">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="rounded-3xl bg-gradient-to-r from-[#ecfdf5] via-[#f0fdf4] to-[#ecfdf5] border border-[#dce8e4] p-8 sm:p-12 shadow-civic-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a]">
                رأيت عطلاً أو مشكلة في حيك اليوم؟
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                لا تتردد، بلاغك المباشر يدعم جهود الهيئات البلدية في رصد الأعطال وصيانة المرافق العامة بكفاءة وسرعة.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-lg bg-[#007766] hover:bg-[#005f52] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all text-center cursor-pointer"
                >
                  سجّل بلاغك في دقيقة واحدة
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-8 py-3.5 text-base font-semibold text-slate-700 transition-colors text-center cursor-pointer"
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
