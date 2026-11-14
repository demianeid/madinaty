import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
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
    <html lang="ar" dir="rtl" className={`${ibmPlexSansArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-canvas-bg text-slate-900 selection:bg-civic-emerald selection:text-white">
        {children}
      </body>
    </html>
  );
}
