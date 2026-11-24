"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NotificationItem } from "@/components/notifications/notification-bell";
import { NotificationItemSkeleton, Skeleton, SkeletonButton } from "@/components/ui/skeleton";

function getTypeBadge(type: string): { label: string; color: string } {
  switch (type) {
    case "REPORT_RESOLVED":
      return { label: "تم الحل", color: "badge-civic-pill badge-civic-success" };
    case "REPORT_REJECTED":
      return { label: "مرفوض", color: "badge-civic-pill badge-civic-danger" };
    case "INFO_REQUESTED":
      return { label: "استفسار مطلوب", color: "badge-civic-pill badge-civic-warning" };
    case "STATUS_CHANGED":
      return { label: "تحديث مرحلة", color: "badge-civic-pill badge-civic-info" };
    case "APPEAL_SUBMITTED":
      return { label: "اعتراض مسجل", color: "badge-civic-pill bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]" };
    case "AUTO_CLOSED":
      return { label: "إغلاق نهائي", color: "badge-civic-pill bg-slate-100 text-slate-700 border border-slate-200" };
    case "REPORT_CREATED":
    default:
      return { label: "بلاغ جديد", color: "badge-civic-pill badge-status-new" };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Require login
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login?redirect=/notifications");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    let isMounted = true;
    if (!session?.user) return;

    async function load() {
      try {
        const res = await fetch(`/api/notifications?limit=50&unreadOnly=${filter === "unread"}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setNotifications(data.items || []);
          setUnreadCount(data.unreadCount || 0);
          setTotalCount(data.totalCount || 0);
        }
      } catch {
        // Ignore
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [session, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
    } catch {
      // Ignore
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col justify-between" dir="rtl">
        <Header />
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 space-y-6" aria-busy="true">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16 rounded-sm" />
            <span className="text-slate-400">/</span>
            <Skeleton className="h-3 w-32 rounded-sm" />
          </div>

          {/* Header Title Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 rounded-lg" />
              <Skeleton className="h-4 w-80 sm:w-96 rounded-sm" />
            </div>
            <SkeletonButton size="sm" className="w-36" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-2 border-b border-[#CBD5E1] pb-3">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>

          {/* Items Skeletons */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between" dir="rtl">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
            لوحة التحكم
          </Link>
          <span>/</span>
          <span className="text-white">مركز الإشعارات والتنبيهات</span>
        </div>

        {/* Header Title & Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#142D4E] flex items-center gap-2.5">
              <span>🔔</span>
              <span>مركز الإشعارات والتنبيهات</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              متابعة حية ومفصلة لكافة التحديثات الميدانية وقرارات الجهات البلدية على بلاغاتك
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              ✓ تحديد جميع التنبيهات كمقروءة
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-[#CBD5E1] pb-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-white text-slate-600 border border-[#CBD5E1] hover:bg-slate-50"
            }`}
          >
            جميع الإشعارات ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-white text-slate-600 border border-[#CBD5E1] hover:bg-slate-50"
            }`}
          >
            <span>غير المقروءة فقط</span>
            {unreadCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                filter === "unread" ? "bg-white text-[#2563EB]" : "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="جاري تحميل الإشعارات">
            {[1, 2, 3, 4].map((i) => (
              <NotificationItemSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-12 text-center shadow-civic-1">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-base font-bold text-[#142D4E]">
              {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد أي إشعارات مسجلة"}
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              {filter === "unread"
                ? "لقد قمت بقراءة جميع الإشعارات والتحديثات الخاصة ببلاغاتك."
                : "ستصلك هنا إشعارات فورية عن أي إجراء يتخذه فريق البلدية بشأن بلاغاتك."}
            </p>
            {filter === "unread" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                عرض الإشعارات المقروءة السابقة
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              const badge = getTypeBadge(n.type);

              return (
                <div
                  key={n.id}
                  className={`rounded-xl border p-5 transition-all shadow-civic-1 ${
                    isUnread
                      ? "bg-white border-[#BFDBFE] ring-2 ring-[#2563EB]/10"
                      : "bg-white border-[#CBD5E1] hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={badge.color}>
                            {badge.label}
                          </span>
                          {n.report && (
                            <span className="rounded bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 font-bold">
                              #{n.report.publicReference}
                            </span>
                          )}
                          {isUnread && (
                            <span className="rounded-full bg-[#2563EB] text-white text-[9px] font-bold px-2 py-0.5">
                              جديد
                            </span>
                          )}
                        </div>

                        <h3 className={`text-sm ${isUnread ? "font-bold text-[#142D4E]" : "font-medium text-slate-800"}`}>
                          {n.title}
                        </h3>

                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {n.body}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#64748B] font-medium font-mono">
                          <span>
                            {new Date(n.createdAt).toLocaleDateString("ar-EG", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start mt-2 sm:mt-0">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(n.id)}
                          className="rounded-lg border border-[#CBD5E1] bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          تحديد كمقروء
                        </button>
                      )}

                      {n.reportId && (
                        <Link
                          href={`/reports/${n.reportId}`}
                          className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                        >
                          عرض البلاغ ←
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
