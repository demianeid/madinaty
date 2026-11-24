import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TrackReportSkeleton } from "@/components/ui/skeleton";

export default function TrackLoading() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 sm:p-8 shadow-civic-1 mb-8 text-center space-y-3">
          <div className="h-6 w-44 rounded-full bg-slate-100 mx-auto" />
          <div className="h-8 w-64 rounded-lg bg-slate-100 mx-auto" />
          <div className="h-4 w-80 rounded-sm bg-slate-100 mx-auto" />
        </div>
        <TrackReportSkeleton />
      </main>
      <Footer />
    </div>
  );
}
