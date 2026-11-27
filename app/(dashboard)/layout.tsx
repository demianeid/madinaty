import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم | مدينتي",
};

export default function DashboardLayout({
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
