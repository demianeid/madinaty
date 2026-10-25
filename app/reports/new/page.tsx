"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
  const [latitude, setLatitude] = useState(30.0444); // Default to Cairo center
  const [longitude, setLongitude] = useState(31.2357);
  const [addressText, setAddressText] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdReference, setCreatedReference] = useState<string | null>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedMedia.length + files.length > 5) {
      setErrorMessage("الحد الأقصى المسموح به هو 5 صور لكل بلاغ.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

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
          setUploadedMedia((prev) => [
            ...prev,
            {
              id: data.media.id,
              storageKey: data.media.storageKey,
              mimeType: data.media.mimeType,
              previewUrl: `/api/media/${data.media.id}`,
            },
          ]);
        } else {
          setErrorMessage(data.error || "فشل رفع إحدى الصور.");
        }
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء معالجة الصور.");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!categoryId) {
      setErrorMessage("يرجى اختيار تصنيف البلاغ قبل الإرسال.");
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
    <div className="min-h-screen flex flex-col">
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
              تم توجيه البلاغ للجهة المختصة وبدء إجراءات التدقيق والمتابعة الميدانية.
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
                أدخل تفاصيل المشكلة بدقة وأرفق صوراً توضيحية لتسريع إجراءات المعالجة
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
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.labelAr}
                      </option>
                    ))}
                  </select>
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
                  الوصف التفصيلي <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="صف المشكلة بدقة وحجم الضرر ومدى تأثيرها على المارة أو المركبات..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Location Coordinates & Address */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    موقع المشكلة (الإحداثيات الجغرافية) <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if ("geolocation" in navigator) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setLatitude(Number(pos.coords.latitude.toFixed(6)));
                            setLongitude(Number(pos.coords.longitude.toFixed(6)));
                          },
                          () => {
                            setErrorMessage("تعذر الحصول على موقعك الجغرافي من المتصفح.");
                          }
                        );
                      }
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>📍</span> تحديد موقعي الحالي
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      خط العرض (Latitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(Number(e.target.value))}
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      خط الطول (Longitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(Number(e.target.value))}
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    العنوان المكتوب أو المعلم القريب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="اسم الشارع، رقم المبنى، أو أقرب معلم مشهور"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Media Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    الصور التوضيحية (بحد أقصى 5 صور، 5MB لكل صورة)
                  </label>
                  <span className="text-xs text-slate-500 font-medium">
                    {uploadedMedia.length} / 5
                  </span>
                </div>

                {/* Upload Previews */}
                {uploadedMedia.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                    {uploadedMedia.map((m, idx) => (
                      <div
                        key={m.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.previewUrl}
                          alt={`صورة ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(m.id)}
                          className="absolute top-1 left-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedMedia.length < 5 && (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="text-2xl">📸</div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">
                        {isUploading
                          ? "جاري معالجة الصورة وإزالة بيانات الموقع الحساسة (EXIF)..."
                          : "اضغط لاختيار صور من جهازك أو اسحبها هنا"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        الأنواع المدعومة: JPG, PNG, WebP (تتم إزالة معلومات EXIF وGPS تلقائياً للحفاظ على خصوصيتك)
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
                  disabled={isSubmitting || isUploading || categoriesLoading || !categoryId}
                  className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "جاري الإرسال والتحقق..." : "إرسال البلاغ الآن"}
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
