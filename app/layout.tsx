import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "مدينتي | المنصة الموحدة للبلاغات والخدمات البلدية",
    template: "%s | مدينتي",
  },
  description:
    "المنصة الوطنية الموحدة للإبلاغ عن مشاكل البنية التحتية والبيئة ومتابعتها مع الجهات المختصة بكل شفافية وسرعة.",
  keywords: ["مدينتي", "بلاغات بلدية", "طرق", "نظافة", "إنارة", "صيانة المرافق"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
