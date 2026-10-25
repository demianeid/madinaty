"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white py-16 sm:py-24 border-b border-slate-100">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-800 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                المنصة البلدية الذكية لصوت المواطن
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                معاً لمدينة أفضل، أنظف، <br className="hidden sm:inline" />
                <span className="text-emerald-700 bg-clip-text text-transparent bg-gradient-to-l from-emerald-600 to-teal-800">
                  وأكثر أماناً
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                أبلغ عن مشكلات الطرق، النظافة، أو الإنارة في حيك وتابع خطوات المعالجة والإصلاح مع الجهات المختصة خطوة بخطوة مع توثيق كامل للنتائج.
              </p>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-emerald-600/35 transition-all text-center"
                >
                  تقديم بلاغ جديد
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center"
                >
                  تسجيل الدخول للمتابعة
                </Link>
              </div>

              {/* Public Reference Quick Tracker */}
              <div id="track" className="mt-12 mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <form
                  action="#"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="flex flex-col sm:flex-row items-center gap-2"
                >
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="MD-XXXX-XXXX"
                    className="w-full uppercase font-mono tracking-wider rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-center focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    className="w-full sm:w-auto whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    استعلام عن بلاغ
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-slate-400 text-center">
                  أدخل الرمز المرجعي العام للبلاغ للاطلاع على آخر حالة معتمدة
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Preview */}
        <section className="py-16 bg-white border-b border-slate-100">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
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
                  icon: "🛣️",
                },
                {
                  title: "أعطال إنارة الشوارع",
                  desc: "إصلاح أعمدة الإنارة المطفأة وتأمين الكابلات الكهربائية السائبة.",
                  icon: "💡",
                },
                {
                  title: "تراكم النفايات والحاويات",
                  desc: "تفريغ الحاويات الممتلئة وتنظيف المكبات العشوائية ونقل المخلفات.",
                  icon: "🚛",
                },
                {
                  title: "تسربات المياه والصرف",
                  desc: "إصلاح الكسور في الشبكات العامة وشفط تجمعات المياه السائبة.",
                  icon: "💧",
                },
                {
                  title: "صيانة الحدائق العامة",
                  desc: "تقليم الأشجار الخطرة، إصلاح ألعاب الأطفال، والعناية بالمرافق الخضراء.",
                  icon: "🌳",
                },
                {
                  title: "مخالفات البناء والإشغالات",
                  desc: "متابعة إشغالات الأرصفة العامة ومخالفات الهدم والبناء غير المرخصة.",
                  icon: "🏗️",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
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
      </main>

      <Footer />
    </div>
  );
}
