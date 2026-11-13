"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const LeafletMap = dynamic(
  () => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 animate-pulse border border-slate-200">
        جاري تحميل خريطة البلاغات التفاعلية...
      </div>
    ),
  }
);

interface CategoryOption {
  id: string;
  key: string;
  labelAr: string;
  descriptionAr: string | null;
}

interface UploadedMediaItem {
  id: string;
  storageKey: string;
  mimeType: string;
  previewUrl: string;
  isInvalid?: boolean;
}

export default function NewReportPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(31.2001); // Default to Alexandria center (Mahatet El Raml)
  const [longitude, setLongitude] = useState(29.9187);
  const [addressText, setAddressText] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  // AI Real-time Image Pre-Validation State
  const [mediaValidationState, setMediaValidationState] = useState<{
    isChecking: boolean;
    isInvalid: boolean;
    invalidImageIndices?: number[];
    verdict?: "VALID" | "INVALID" | "UNCERTAIN";
    notice: string | null;
  }>({
    isChecking: false,
    isInvalid: false,
    invalidImageIndices: [],
    verdict: undefined,
    notice: null,
  });

  // AI Auto-Switched Category — stores the previous value for undo
  const [categoryAutoSwitch, setCategoryAutoSwitch] = useState<{
    prevId: string;
    prevLabel: string;
    newLabel: string;
  } | null>(null);

  // Require authentication
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login?redirect=/reports/new");
    }
  }, [session, sessionLoading, router]);

  // Load categories
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories.length > 0) {
          setCategories(data.categories);
          setCategoryId(data.categories[0].id);
        }
      })
      .catch(() => {
        setErrorMessage("تعذر تحميل تصنيفات البلاغات من الخادم.");
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Pre-check uploaded images using Gemini AI
  const runMediaPreCheck = async (mediaList: UploadedMediaItem[], overrideCategoryId?: string) => {
    if (mediaList.length === 0) {
      setMediaValidationState({ isChecking: false, isInvalid: false, invalidImageIndices: [], notice: null });
      setCategoryAutoSwitch(null);
      return;
    }

    const currentCatId = overrideCategoryId || categoryId;

    setMediaValidationState({
      isChecking: true,
      isInvalid: false,
      invalidImageIndices: [],
      notice: mediaList.length > 1
        ? `جاري الفحص الذكي لجميع الصور المرفقة (${mediaList.length} صور) بالذكاء الاصطناعي والتأكد من مطابقتها وتصنيفها...`
        : "جاري الفحص الذكي للصورة بالذكاء الاصطناعي والتأكد من مطابقتها للبلاغات البلدية...",
    });

    try {
      const res = await fetch("/api/ai/pre-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: mediaList.map((m) => m.id),
          title,
          description,
          categoryId: currentCatId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.verdict === "INVALID") {
          const rawIndices: number[] = Array.isArray(data.invalidImageIndices) ? data.invalidImageIndices : [];
          const invalidIndices = rawIndices.length > 0 ? rawIndices : [1];

          // Flagged as non-municipal / invalid content
          setMediaValidationState({
            isChecking: false,
            isInvalid: true,
            invalidImageIndices: invalidIndices,
            verdict: "INVALID",
            notice: `⚠️ ${data.reason}`,
          });

          // Mark specific invalid images in uploaded list
          setUploadedMedia((prev) =>
            prev.map((item, idx) => ({
              ...item,
              isInvalid: invalidIndices.includes(idx + 1),
            }))
          );

          setCategoryAutoSwitch(null);
        } else if (data.verdict === "UNCERTAIN") {
          // AI inspection timed out or couldn't conclude -> Fall back to human review without blocking
          setMediaValidationState({
            isChecking: false,
            isInvalid: false,
            invalidImageIndices: [],
            verdict: "UNCERTAIN",
            notice: `ℹ️ تعذر اكتمال الفحص الآلي اللحظي للصورة (${data.reason}). يمكنك إرسال البلاغ وسيتم تدقيقه يدوياً بواسطة فريق البلدية.`,
          });
          setUploadedMedia((prev) => prev.map((item) => ({ ...item, isInvalid: false })));
          setCategoryAutoSwitch(null);
        } else {
          // Explicitly VALID issue across all images
          setMediaValidationState({
            isChecking: false,
            isInvalid: false,
            invalidImageIndices: [],
            verdict: "VALID",
            notice: mediaList.length > 1
              ? `✓ تم التحقق: جميع الصور المرفقة (${mediaList.length} صور) مطابقة لبلاغ بلدي معتمد (${data.reason})`
              : `✓ تم التحقق: الصورة مطابقة لبلاغ بلدي معتمد (${data.reason})`,
          });
          setUploadedMedia((prev) => prev.map((item) => ({ ...item, isInvalid: false })));

          // Auto-switch category if AI detected a better match
          if (data.isMismatch && data.suggestedCategory) {
            const prevLabel =
              categories.find((c) => c.id === currentCatId)?.labelAr ||
              data.currentCategory?.labelAr ||
              "التصنيف السابق";
            setCategoryId(data.suggestedCategory.id);
            setCategoryAutoSwitch({
              prevId: currentCatId,
              prevLabel,
              newLabel: data.suggestedCategory.labelAr,
            });
          } else {
            setCategoryAutoSwitch(null);
          }
        }
      } else {
        setMediaValidationState({ isChecking: false, isInvalid: false, invalidImageIndices: [], verdict: undefined, notice: null });
        setCategoryAutoSwitch(null);
      }
    } catch {
      // Fail-safe: don't block user if pre-check network call fails
      setMediaValidationState({ isChecking: false, isInvalid: false, invalidImageIndices: [], verdict: undefined, notice: null });
      setCategoryAutoSwitch(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedMedia.length + files.length > 5) {
      setErrorMessage("الحد الأقصى المسموح به هو 5 صور لكل بلاغ.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    const newUploaded: UploadedMediaItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setErrorMessage(`الملف "${file.name}" يتجاوز 5 ميجابايت.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.media) {
          newUploaded.push({
            id: data.media.id,
            storageKey: data.media.storageKey,
            mimeType: data.media.mimeType,
            previewUrl: `/api/media/${data.media.id}`,
          });
        } else {
          setErrorMessage(data.error || "فشل رفع إحدى الصور.");
        }
      }

      if (newUploaded.length > 0) {
        const updatedList = [...uploadedMedia, ...newUploaded];
        setUploadedMedia(updatedList);
        // Trigger AI Pre-Validation
        runMediaPreCheck(updatedList);
      }
    } catch {
      setErrorMessage("حدث خطأ في الاتصال أثناء رفع الصور.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    const updatedList = uploadedMedia.filter((m) => m.id !== mediaId);
    setUploadedMedia(updatedList);
    runMediaPreCheck(updatedList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!categoryId) {
      setErrorMessage("يرجى اختيار تصنيف البلاغ قبل الإرسال.");
      return;
    }

    if (mediaValidationState.isInvalid) {
      setErrorMessage("لا يمكن إرسال البلاغ بصور غير مطابقة للأعطال البلدية. يرجى حذف الصورة المرفقة وإرفاق صورة حقيقية للعطل.");
      return;
    }

    if (uploadedMedia.length === 0) {
      setErrorMessage("يرجى إرفاق صورة واحدة على الأقل توثق المشكلة البلدية لتمكين الفحص الذكي وإتمام الإرسال.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title,
        categoryId,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
        addressText,
        mediaIds: uploadedMedia.map((m) => m.id),
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || "فشل تقديم البلاغ.");
      } else {
        setCreatedReference(data.report.publicReference);
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء حفظ البلاغ. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {createdReference ? (
          /* Success Screen */
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold mb-4">
              ✓
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              تم استلام بلاغك بنجاح!
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              تم توجيه البلاغ للجهة المختصة وفحصه بالذكاء الاصطناعي وبدء إجراءات التدقيق والمتابعة الميدانية.
            </p>

            <div className="mx-auto max-w-xs rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-6">
              <span className="block text-xs font-semibold text-slate-500 mb-1">
                الرمز المرجعي العام للبلاغ
              </span>
              <span className="font-mono text-xl font-extrabold text-emerald-800 tracking-wider">
                {createdReference}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/reports/${createdReference}`}
                className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                متابعة تفاصيل البلاغ
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                العودة للوحة التحكم
              </Link>
            </div>
          </div>
        ) : (
          /* Report Creation Form */
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
            <div className="mb-8 border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
                بلاغ جديد
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                تسجيل بلاغ بلدي أو بيئي
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                أدخل تفاصيل المشكلة بدقة وحدد موقعها على الخريطة التفاعلية لتسريع إجراءات المعالجة الميدانية
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  تصنيف المشكلة <span className="text-red-500">*</span>
                </label>

                {categoriesLoading ? (
                  <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
                ) : (
                  <>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        setCategoryId(newCatId);
                        setCategoryAutoSwitch(null);
                        if (uploadedMedia.length > 0 && !mediaValidationState.isInvalid && !mediaValidationState.isChecking) {
                          runMediaPreCheck(uploadedMedia, newCatId);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.labelAr}
                        </option>
                      ))}
                    </select>

                    {/* Auto-Switch Undo Chip */}
                    {categoryAutoSwitch && (
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="text-sky-600">✦</span>
                        <span>
                          عدّل الذكاء الاصطناعي التصنيف إلى{" "}
                          <strong className="text-slate-700">«{categoryAutoSwitch.newLabel}»</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryId(categoryAutoSwitch.prevId);
                            setCategoryAutoSwitch(null);
                          }}
                          className="text-slate-400 hover:text-rose-500 underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          تراجع
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان البلاغ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: هبوط أسفلتي وتجمع مياه أمام مدرسة الحي"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الوصف <span className="text-red-500">*</span>{" "}
                  <span className="font-normal text-slate-400">(5 أحرف على الأقل)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="صف المشكلة باختصار... (مثال: كابل كهرباء مكشوف، حفرة عميقة، بالوعة مكسورة)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Interactive Leaflet Map (Epic 3.2) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    موقع المشكلة على الخريطة التفاعلية <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    انقر على الخريطة أو اسحب المؤشر لتحديد الموقع
                  </span>
                </div>

                <LeafletMap
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng) => {
                    setLatitude(Number(lat.toFixed(6)));
                    setLongitude(Number(lng.toFixed(6)));
                  }}
                  height="340px"
                />

                {/* Optional Address & Manual Coordinates Toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      العنوان المكتوب أو المعلم القريب (اختياري)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowManualCoords(!showManualCoords)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                    >
                      {showManualCoords ? "إخفاء تفاصيل الإحداثيات اليدوية" : "تعديل الإحداثيات يدوياً"}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="اسم الشارع، رقم المبنى، أو أقرب معلم مشهور"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />

                  {showManualCoords && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          خط العرض (Latitude)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={latitude}
                          onChange={(e) => setLatitude(Number(e.target.value))}
                          dir="ltr"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          خط الطول (Longitude)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={longitude}
                          onChange={(e) => setLongitude(Number(e.target.value))}
                          dir="ltr"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos Upload with Automatic EXIF Scrubbing & Real-time AI Inspection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  الصور التوضيحية{" "}
                  <span className="text-red-500">*</span>{" "}
                  <span className="font-normal text-slate-500">
                    (صورة واحدة على الأقل، بحد أقصى 5 صور — 5MB لكل صورة)
                  </span>{" "}
                  <span className="font-normal text-slate-400">
                    {uploadedMedia.length} / 5
                  </span>
                </label>

                {/* AI Real-time Image Inspection Status */}
                {mediaValidationState.isChecking ? (
                  /* ── SCANNING LOADER ── */
                  <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50/60 p-4 shadow-sm overflow-hidden relative">
                    {/* Animated shimmer line */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-[shimmer_1.8s_ease-in-out_infinite]" />

                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* Pulsing AI orb */}
                      <div className="relative shrink-0 w-9 h-9">
                        <div className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping" />
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
                          <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-sky-900">تحليل الصور بالذكاء الاصطناعي</p>
                        <p className="text-[11px] text-sky-700 mt-0.5">
                          {uploadedMedia.length > 1
                            ? `جاري معالجة ${uploadedMedia.length} صور — قد يستغرق 5-8 ثوانٍ`
                            : "جاري معالجة الصورة — قد يستغرق 3-5 ثوانٍ"}
                        </p>
                      </div>
                    </div>

                    {/* Thumbnails with scanning overlay */}
                    {uploadedMedia.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {uploadedMedia.map((media, idx) => (
                          <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden border border-sky-200 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media.previewUrl} alt={`#${idx + 1}`} className="w-full h-full object-cover opacity-60" />
                            {/* Scan line sweep */}
                            <div
                              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400/90 to-transparent animate-[scanline_1.5s_ease-in-out_infinite]"
                              style={{ animationDelay: `${idx * 0.18}s` }}
                            />
                            {/* Index */}
                            <span className="absolute top-1 left-1 text-[9px] font-mono font-bold bg-sky-700/80 text-white rounded px-1">
                              #{idx + 1}
                            </span>
                            {/* Corner pulse dot */}
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-400 animate-ping opacity-75" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : mediaValidationState.notice && (
                  /* ── RESULT ALERT ── */
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm border transition-all ${
                      mediaValidationState.isInvalid
                        ? "bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm"
                        : mediaValidationState.verdict === "UNCERTAIN"
                        ? "bg-amber-50/80 border border-amber-200 text-amber-900"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">
                        {mediaValidationState.isInvalid
                          ? "⚠️"
                          : mediaValidationState.verdict === "UNCERTAIN"
                          ? "ℹ️"
                          : "✓"}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold">{mediaValidationState.notice}</p>
                        {mediaValidationState.isInvalid && (
                          <p className="mt-1 text-xs text-rose-700 leading-relaxed font-semibold">
                            تم قفل زر إرسال البلاغ تلقائياً. يرجى الضغط على زر (✕) لحذف الصورة غير المطابقة، ثم إرفاق صورة حقيقية وواضحة للمشكلة البلدية لتتمكن من إتمام الإرسال.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded Photos Preview — only shown when not scanning */}
                {!mediaValidationState.isChecking && uploadedMedia.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {uploadedMedia.map((media, idx) => {
                      const imageIndex = idx + 1;
                      const isThisImageInvalid = Boolean(
                        media.isInvalid ||
                        (mediaValidationState.isInvalid &&
                          mediaValidationState.invalidImageIndices?.includes(imageIndex))
                      );
                      const isCheckPassed =
                        !mediaValidationState.isChecking &&
                        mediaValidationState.verdict === "VALID" &&
                        !isThisImageInvalid;

                      return (
                        <div
                          key={media.id}
                          className={`relative group rounded-xl overflow-hidden border aspect-square transition-all ${
                            isThisImageInvalid
                              ? "border-2 border-rose-500 ring-2 ring-rose-300 shadow-sm bg-rose-50/40"
                              : isCheckPassed
                              ? "border-2 border-emerald-500/80 ring-1 ring-emerald-200 bg-emerald-50/20"
                              : "border-slate-200 bg-slate-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={media.previewUrl}
                            alt={`مرفق البلاغ #${imageIndex}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Index Badge */}
                          <span className="absolute top-1.5 left-1.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 shadow-sm z-10">
                            #{imageIndex}
                          </span>

                          {/* Invalid Banner */}
                          {isThisImageInvalid && (
                            <span className="absolute bottom-1 right-1 left-1 text-center bg-rose-600 text-white text-[10px] font-bold py-1 px-1 rounded shadow-sm flex items-center justify-center gap-1 z-10">
                              <span>⚠️</span>
                              <span>غير مطابقة (احذفها)</span>
                            </span>
                          )}

                          {/* Valid Check Banner */}
                          {isCheckPassed && (
                            <span className="absolute bottom-1 right-1 left-1 text-center bg-emerald-600/90 text-white text-[10px] font-semibold py-0.5 rounded z-10">
                              ✓ مطابقة
                            </span>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(media.id)}
                            className={`absolute top-1.5 right-1.5 rounded-full p-1.5 text-xs z-10 transition-all cursor-pointer ${
                              isThisImageInvalid
                                ? "bg-rose-600 text-white shadow-md ring-2 ring-white hover:bg-rose-700 animate-pulse"
                                : "bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600"
                            }`}
                            title={isThisImageInvalid ? "حذف هذه الصورة غير المطابقة" : "حذف الصورة"}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {uploadedMedia.length < 5 && (
                  <div
                    className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors bg-slate-50/50 ${
                      uploadedMedia.length === 0
                        ? "border-amber-300 hover:border-amber-400"
                        : "border-slate-300 hover:border-emerald-500"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1">
                      <div className="text-2xl">{uploadedMedia.length === 0 ? "📎" : "📸"}</div>
                      <p className="text-xs font-bold text-slate-700">
                        {isUploading
                          ? "جاري التحقق من الصورة وإزالة بيانات EXIF..."
                          : uploadedMedia.length === 0
                          ? "إرفاق صورة للمشكلة (مطلوب)"
                          : "اضغط لإضافة المزيد من الصور"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        الأنواع المدعومة: JPG, PNG, WebP (يتم فحص الصورة فورياً بالذكاء الاصطناعي وتجريد بيانات الموقع والكاميرا تلقائياً)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إلغاء
                </Link>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isUploading ||
                    categoriesLoading ||
                    !categoryId ||
                    uploadedMedia.length === 0 ||
                    mediaValidationState.isChecking ||
                    mediaValidationState.isInvalid
                  }
                  className={`rounded-xl px-8 py-3 text-sm font-bold text-white shadow-md transition-colors ${
                    mediaValidationState.isInvalid
                      ? "bg-rose-600 hover:bg-rose-700 disabled:opacity-60 cursor-not-allowed"
                      : uploadedMedia.length === 0
                      ? "bg-slate-400 cursor-not-allowed disabled:opacity-70"
                      : "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  }`}
                >
                  {isSubmitting
                    ? "جاري الإرسال واعتماد البلاغ..."
                    : mediaValidationState.isChecking
                    ? "جاري الفحص الذكي للصور..."
                    : mediaValidationState.isInvalid
                    ? mediaValidationState.invalidImageIndices && mediaValidationState.invalidImageIndices.length > 0
                      ? `غير متاح للإرسال (الصورة رقم ${mediaValidationState.invalidImageIndices.join(" و ")} غير مطابقة)`
                      : "غير متاح للإرسال (الصورة غير مطابقة)"
                    : uploadedMedia.length === 0
                    ? "أرفق صورة أولاً لإتمام الإرسال"
                    : "إرسال البلاغ الآن"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
