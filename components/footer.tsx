import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      {/* Emergency Guidance Banner (DEC-05) */}
      <div id="emergency" className="bg-amber-50 border-b border-amber-200 py-3 px-4">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 font-bold">
              !
            </span>
            <span>
              <strong>تنبيه هام:</strong> منصة مدينتي مخصصة للبلاغات البلدية غير الطارئة. في حالات الطوارئ الخطرة (حرائق، أسلاك كهرباء مكشوفة، تسرب غاز، انهيارات) يرجى الاتصال الفوري بالدفاع المدني أو الطوارئ.
            </span>
          </div>
          <div className="flex items-center gap-3 font-bold shrink-0">
            <span className="bg-white border border-amber-300 rounded px-2 py-0.5">الدفاع المدني: 180</span>
            <span className="bg-white border border-amber-300 rounded px-2 py-0.5">الإسعاف: 123</span>
            <span className="bg-white border border-amber-300 rounded px-2 py-0.5">النجدة: 122</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p>© 2026 مدينتي — المنصة الموحدة للبلاغات والخدمات البلدية. جميع الحقوق محفوظة.</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-emerald-700 transition-colors">
              سياسة الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-emerald-700 transition-colors">
              شروط الاستخدام
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">الإصدار 1.0 (المرحلة 1)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
