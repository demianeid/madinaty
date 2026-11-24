import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminDashboardSkeleton />
      </main>
      <Footer />
    </div>
  );
}
