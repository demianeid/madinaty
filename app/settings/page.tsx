"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, signOut, useSession } from "@/lib/auth/auth-client";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ALEXANDRIA_SECTORS } from "@/lib/alexandria/sectors";
import type { AlexandriaSector } from "@prisma/client";
import { UserRole } from "@prisma/client";

interface ProfileMembership {
  id: string;
  membershipRole: string;
  sector: AlexandriaSector | null;
  authority: { nameAr: string; slug: string };
  assignedArea: { nameAr: string } | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  status: string;
  preferredLocale: string;
  createdAt: string;
  memberships?: ProfileMembership[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام العام",
  STAFF: "طاقم العمليات الميدانية",
  CITIZEN: "مواطن / مقيم",
};

const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  AUTHORITY_ADMIN: "مدير القطاع",
  TRIAGE: "منسق فرز وتوجيه",
  OPERATOR: "فني ميداني",
  VIEWER: "مراقب",
};

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login?redirect=/settings");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session?.user) return;
    let alive = true;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (data.success && data.profile) {
          setProfile(data.profile);
          setName(data.profile.name || "");
          setPhoneNumber(data.profile.phoneNumber || "");
        }
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile((prev) => (prev ? { ...prev, ...data.profile } : data.profile));
        setProfileMessage({ type: "success", text: "تم حفظ البيانات الشخصية بنجاح." });
      } else {
        setProfileMessage({ type: "error", text: data.error || "تعذر حفظ التعديلات." });
      }
    } catch {
      setProfileMessage({ type: "error", text: "فشل الاتصال بالخادم." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "تأكيد كلمة المرور غير مطابق للكلمة الجديدة." });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (error) {
        setPasswordMessage({
          type: "error",
          text:
            error.message === "Invalid password"
              ? "كلمة المرور الحالية غير صحيحة."
              : error.message || "تعذر تغيير كلمة المرور.",
        });
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMessage({ type: "success", text: "تم تغيير كلمة المرور بنجاح." });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "حدث خطأ أثناء تغيير كلمة المرور." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">الإعدادات والملف الشخصي</span>
          </div>
        </header>
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 space-y-6">
          <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!session?.user || !profile) return null;

  const isDirtyProfile =
    name.trim() !== (profile.name || "") ||
    phoneNumber.trim() !== (profile.phoneNumber || "");

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
      {/* Unified Light Header */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
            <MadinatyLogo variant="dark" priority className="h-8 w-auto object-contain" />
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 hidden sm:inline">
            الإعدادات والملف الشخصي
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 text-xs font-bold text-slate-700 transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>لوحة التحكم</span>
          </Link>

          <NotificationBell variant="light" />

          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          >
            خروج
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#142D4E]">إعدادات الحساب والملف الشخصي</h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة بياناتك الشخصية وتحديث كلمة المرور الخاصة بحسابك في منصة مدينتي
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-bold text-[#0E7490]">
            {ROLE_LABELS[profile.role] || profile.role}
          </span>
        </div>

        {/* Staff Assignment Info (Read-only, if STAFF) */}
        {profile.role === UserRole.STAFF && profile.memberships && profile.memberships.length > 0 && (
          <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/40 p-5 space-y-3">
            <h2 className="text-xs font-bold text-[#142D4E] flex items-center gap-2">
              <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              بيانات التكليف الوظيفي (للعرض فقط)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {profile.memberships.map((m) => (
                <div key={m.id} className="contents">
                  <div className="rounded-xl bg-white border border-slate-200/80 p-3">
                    <span className="text-[10px] text-slate-400 block">الجهة المختصة</span>
                    <span className="font-bold text-[#142D4E] mt-0.5 block">{m.authority.nameAr}</span>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200/80 p-3">
                    <span className="text-[10px] text-slate-400 block">القطاع والنطاق</span>
                    <span className="font-bold text-[#0891B2] mt-0.5 block">
                      {m.sector ? ALEXANDRIA_SECTORS[m.sector]?.labelAr : "كافة القطاعات"}
                      {m.assignedArea ? ` • ${m.assignedArea.nameAr}` : ""}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200/80 p-3">
                    <span className="text-[10px] text-slate-400 block">الدور الوظيفي</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {MEMBERSHIP_ROLE_LABELS[m.membershipRole] || m.membershipRole}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Editable Personal Info */}
        <form
          onSubmit={handleProfileSave}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-civic-1 space-y-5"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#142D4E]">البيانات الشخصية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك تعديل الاسم الكامل ورقم الهاتف. البريد الإلكتروني والدور ثابتان لأسباب أمنية.
            </p>
          </div>

          {profileMessage && (
            <div
              className={`rounded-xl border p-3 text-xs font-semibold ${
                profileMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name (Editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-2xs"
              />
            </div>

            {/* Phone Number (Editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 text-right focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-2xs"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                البريد الإلكتروني (غير قابل للتعديل)
              </label>
              <input
                type="email"
                dir="ltr"
                value={profile.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 text-right cursor-not-allowed"
              />
            </div>

            {/* Joined Date (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                تاريخ الانضمام
              </label>
              <input
                type="text"
                value={new Date(profile.createdAt).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile || !isDirtyProfile || !name.trim()}
              className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>

        {/* Section 2: Security & Password Change */}
        <form
          onSubmit={handlePasswordChange}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-civic-1 space-y-5"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#142D4E]">الأمان وتغيير كلمة المرور</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              استخدم كلمة مرور قوية لا تقل عن 8 أحرف لحماية حسابك
            </p>
          </div>

          {passwordMessage && (
            <div
              className={`rounded-xl border p-3 text-xs font-semibold ${
                passwordMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-9 py-2.5 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="إظهار أو إخفاء كلمة المرور"
                >
                  <EyeIcon visible={showCurrentPw} />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-9 py-2.5 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="إظهار أو إخفاء كلمة المرور"
                >
                  <EyeIcon visible={showNewPw} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-9 py-2.5 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="إظهار أو إخفاء كلمة المرور"
                >
                  <EyeIcon visible={showConfirmPw} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-xl bg-[#142D4E] hover:bg-[#0E7490] px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {savingPassword ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
