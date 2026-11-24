import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NotificationsSkeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        <NotificationsSkeleton />
      </main>
      <Footer />
    </div>
  );
}
