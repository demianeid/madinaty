import Link from "next/link";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900" dir="rtl">
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <span className="text-xs sm:text-sm font-bold text-slate-800">مركز الرقابة والإدارة</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </header>
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminDashboardSkeleton />
      </main>
    </div>
  );
}
