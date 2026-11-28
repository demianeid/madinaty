"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlexandriaSector, MembershipRole } from "@prisma/client";
import { ALEXANDRIA_SECTORS, ALEXANDRIA_SECTOR_LIST } from "@/lib/alexandria/sectors";
import { Skeleton } from "@/components/ui/skeleton";

interface StaffAuthority {
  id: string;
  nameAr: string;
  slug: string;
}

interface StaffDistrict {
  id: string;
  code: string | null;
  nameAr: string;
  sector: AlexandriaSector | null;
}

interface StaffRow {
  id: string;
  authorityId: string;
  membershipRole: MembershipRole;
  sector: AlexandriaSector | null;
  assignedAreaId: string | null;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    status: string;
  };
  authority: StaffAuthority;
  assignedArea: StaffDistrict | null;
}

const ROLE_META: Record<MembershipRole, { label: string; badgeClass: string }> = {
  AUTHORITY_ADMIN: {
    label: "مدير إداري للقطاع",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  TRIAGE: {
    label: "منسق فرز وتوجيه",
    badgeClass: "bg-cyan-50 text-[#0891B2] border-cyan-200",
  },
  OPERATOR: {
    label: "فني ميداني",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  VIEWER: {
    label: "مراقب",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function StaffManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [scopeAuthority, setScopeAuthority] = useState<StaffAuthority | null>(null);
  const [scopeSector, setScopeSector] = useState<AlexandriaSector | null>(null);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [authorities, setAuthorities] = useState<StaffAuthority[]>([]);
  const [districts, setDistricts] = useState<StaffDistrict[]>([]);

  // Filters
  const [filterAuthority, setFilterAuthority] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<MembershipRole>("OPERATOR");
  const [formAuthorityId, setFormAuthorityId] = useState("");
  const [formSector, setFormSector] = useState<AlexandriaSector>("ALX_EAST");
  const [formDistrictId, setFormDistrictId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Action loading state (per row id)
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحميل قائمة الموظفين.");
      }
      setIsSuperAdmin(Boolean(data.isSuperAdmin));
      setScopeAuthority(data.scopeAuthority || null);
      setScopeSector(data.scopeSector || null);
      setStaff(data.staff || []);
      setAuthorities(data.authorities || []);
      setDistricts(data.districts || []);

      if (data.authorities?.length > 0 && !formAuthorityId) {
        setFormAuthorityId(data.authorities[0].id);
      }
      if (data.scopeSector) {
        setFormSector(data.scopeSector);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل البيانات.");
    } finally {
      setLoading(false);
    }
  }, [formAuthorityId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    return staff.filter((row) => {
      if (filterAuthority && row.authorityId !== filterAuthority) return false;
      if (filterSector && row.sector !== filterSector) return false;
      if (filterRole && row.membershipRole !== filterRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          row.user.name.toLowerCase().includes(q) ||
          row.user.email.toLowerCase().includes(q) ||
          (row.assignedArea?.nameAr || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [staff, filterAuthority, filterSector, filterRole, searchQuery]);

  const modalDistricts = useMemo(() => {
    const targetSector = isSuperAdmin ? formSector : scopeSector;
    return districts.filter((d) => !targetSector || d.sector === targetSector);
  }, [districts, isSuperAdmin, formSector, scopeSector]);

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        phoneNumber: formPhone.trim(),
        password: formPassword,
        membershipRole: formRole,
        ...(isSuperAdmin
          ? { authorityId: formAuthorityId, sector: formSector }
          : {}),
        assignedAreaId: formDistrictId || null,
      };

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إضافة الموظف.");
      }

      setStaff((prev) => [data.staff, ...prev]);
      setShowModal(false);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormPassword("");
      setFormDistrictId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "فشل إضافة الموظف.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(row: StaffRow) {
    setUpdatingId(row.id);
    try {
      const res = await fetch(`/api/admin/staff/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحديث الحالة.");
      }
      setStaff((prev) => prev.map((r) => (r.id === row.id ? data.staff : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث الحساب.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-extrabold text-[#142D4E]">
              {isSuperAdmin ? "إدارة الموظفين والهيئات بالمحافظة" : "إدارة فريق القطاع"}
            </h2>
            {!isSuperAdmin && scopeAuthority && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0891B2]">
                <span>{scopeAuthority.nameAr}</span>
                {scopeSector && (
                  <>
                    <span>•</span>
                    <span>{ALEXANDRIA_SECTORS[scopeSector]?.labelAr}</span>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isSuperAdmin
              ? "إضافة وتعيين مدراء القطاعات، منسقي الفرز، والفنيين الميدانيين عبر الجهات الست وقطاعات الإسكندرية الأربعة."
              : "إضافة وإدارة منسقي الفرز والفنيين الميدانيين داخل نطاق قطاعك وجهتك فقط."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError("");
            if (!isSuperAdmin && formRole === "AUTHORITY_ADMIN") {
              setFormRole("OPERATOR");
            }
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>{isSuperAdmin ? "إضافة موظف / مدير قطاع" : "إضافة منسق أو فني"}</span>
        </button>
      </div>

      {/* Quick Summary Ribbon */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي الكوادر</span>
            <p className="text-xl font-black text-[#142D4E] mt-1 font-mono">{staff.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 block">نشطون</span>
            <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
              {staff.filter((s) => s.isActive).length}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 block">مجمّدون</span>
            <p className="text-xl font-black text-rose-800 mt-1 font-mono">
              {staff.filter((s) => !s.isActive).length}
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم، البريد، أو الحي..."
          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0891B2] focus:bg-white focus:outline-none"
        />

        {isSuperAdmin && (
          <select
            value={filterAuthority}
            onChange={(e) => setFilterAuthority(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="">كافة الجهات المختصة</option>
            {authorities.map((a) => (
              <option key={a.id} value={a.id}>{a.nameAr}</option>
            ))}
          </select>
        )}

        {isSuperAdmin && (
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="">كافة القطاعات (4)</option>
            {ALEXANDRIA_SECTOR_LIST.map((s) => (
              <option key={s.key} value={s.key}>{s.labelAr}</option>
            ))}
          </select>
        )}

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 font-medium focus:border-[#0891B2] focus:bg-white focus:outline-none cursor-pointer"
        >
          <option value="">كافة الأدوار الوظيفية</option>
          {isSuperAdmin && (
            <option value="AUTHORITY_ADMIN">مدير إداري للقطاع</option>
          )}
          <option value="TRIAGE">منسق فرز وتوجيه</option>
          <option value="OPERATOR">فني ميداني</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Staff List */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-400 font-medium">
            لا يوجد موظفون مطابقون لمعايير البحث الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">الجهة والقطاع</th>
                  <th className="py-3 px-4">الدور</th>
                  <th className="py-3 px-4">الحي المعيّن</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((row) => {
                  const roleInfo = ROLE_META[row.membershipRole] || ROLE_META.OPERATOR;
                  const canManageRow =
                    isSuperAdmin || row.membershipRole !== "AUTHORITY_ADMIN";

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.user.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{row.user.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{row.authority.nameAr}</div>
                        <div className="text-[11px] text-[#0891B2] font-medium mt-0.5">
                          {row.sector ? ALEXANDRIA_SECTORS[row.sector]?.labelAr : "عام"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${roleInfo.badgeClass}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {row.assignedArea ? row.assignedArea.nameAr : "كافة أحياء القطاع"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {row.isActive ? "نشط" : "مجمّد"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {canManageRow ? (
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={() => handleToggleActive(row)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                              row.isActive
                                ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {updatingId === row.id
                              ? "جاري..."
                              : row.isActive
                              ? "تجميد"
                              : "تفعيل"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">محمي</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm font-extrabold text-[#142D4E]">
                {isSuperAdmin ? "إضافة موظف أو مدير قطاع جديد" : "إضافة منسق فرز أو فني ميداني"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5 text-xs">
              {!isSuperAdmin && scopeAuthority && (
                <div className="rounded-xl bg-cyan-50/70 border border-cyan-200 px-3.5 py-2.5 flex items-center justify-between">
                  <span className="font-bold text-[#142D4E]">{scopeAuthority.nameAr}</span>
                  <span className="font-bold text-[#0891B2]">
                    {scopeSector ? ALEXANDRIA_SECTORS[scopeSector]?.labelAr : ""}
                  </span>
                </div>
              )}

              {isSuperAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الجهة المختصة *</label>
                    <select
                      value={formAuthorityId}
                      onChange={(e) => setFormAuthorityId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0891B2] focus:outline-none"
                    >
                      {authorities.map((a) => (
                        <option key={a.id} value={a.id}>{a.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">القطاع الميداني *</label>
                    <select
                      value={formSector}
                      onChange={(e) => {
                        setFormSector(e.target.value as AlexandriaSector);
                        setFormDistrictId("");
                      }}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0891B2] focus:outline-none"
                    >
                      {ALEXANDRIA_SECTOR_LIST.map((s) => (
                        <option key={s.key} value={s.key}>{s.labelAr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الدور الوظيفي *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as MembershipRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0891B2] focus:outline-none"
                  >
                    {isSuperAdmin && (
                      <option value="AUTHORITY_ADMIN">مدير إداري للقطاع</option>
                    )}
                    <option value="TRIAGE">منسق فرز وتوجيه</option>
                    <option value="OPERATOR">فني ميداني</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الحي المعيّن (اختياري)</label>
                  <select
                    value={formDistrictId}
                    onChange={(e) => setFormDistrictId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0891B2] focus:outline-none"
                  >
                    <option value="">كافة أحياء القطاع</option>
                    {modalDistricts.map((d) => (
                      <option key={d.id} value={d.id}>{d.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: م. كريم عبد الله"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0891B2] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@alex.gov.eg"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0891B2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      className="w-full rounded-xl border border-slate-300 bg-white pe-3 ps-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0891B2] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 hover:text-[#0891B2] cursor-pointer transition-colors"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ وإنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
