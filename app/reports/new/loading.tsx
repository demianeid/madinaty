import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewReportFormSkeleton } from "@/components/ui/skeleton";

export default function NewReportLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <NewReportFormSkeleton />
      </main>
      <Footer />
    </div>
  );
}
