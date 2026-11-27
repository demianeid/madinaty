import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البلاغات البلدية | مدينتي",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-[#0891B2] selection:text-white relative z-0">
      {children}
    </div>
  );
}
