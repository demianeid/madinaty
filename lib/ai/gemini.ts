import { serverEnv } from "@/lib/env";
import sharp from "sharp";

export interface CategoryTaxonomyItem {
  key: string;
  labelAr: string;
  descriptionAr?: string;
}

export interface GeminiInspectionInput {
  title: string;
  description: string;
  categoryKey?: string;
  categoryLabel?: string;
  availableCategories?: CategoryTaxonomyItem[];
  imageBuffers?: { buffer: Buffer; mimeType: string }[];
}

export interface GeminiValidationResult {
  verdict: "VALID" | "INVALID" | "UNCERTAIN";
  confidence: number;
  reason: string;
  suggestedCategoryKey?: string;
  invalidImageIndices?: number[]; // 1-based indices of invalid images (e.g. [2])
  modelUsed?: string;
  executionTimeMs?: number;
  error?: string;
}

const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest", // Proven fastest multimodal router (2-3s response)
  "gemini-3.5-flash-lite",    // Lightweight fast candidate
  "gemini-3.1-flash-lite",    // Secondary flash-lite fallback
  "gemini-flash-latest",      // Full flash model fallback
];

const DEFAULT_TIMEOUT_MS = serverEnv.GEMINI_TIMEOUT_MS || 15000;

// Standard municipal taxonomy for fallback if not passed dynamically
const DEFAULT_MUNICIPAL_TAXONOMY: CategoryTaxonomyItem[] = [
  {
    key: "road-hazards",
    labelAr: "حفر وتصدعات الطرق والأرصفة",
    descriptionAr: "الحفر الوعائية، هبوط وتشققات الأسفلت، تلف بلاط الأرصفة العامة، والمطبات العشوائية غير المرخصة",
  },
  {
    key: "street-lighting",
    labelAr: "أعطال إنارة الشوارع",
    descriptionAr: "أعمدة الإنارة المطفأة أو المكسورة، كوابل وأسلاك الكهرباء المكشوفة في الشارع، كشافات الطرق التالفة",
  },
  {
    key: "waste-management",
    labelAr: "تراكم النفايات والحاويات",
    descriptionAr: "تراكم أكوام القمامة، تلف أو فيضان حاويات النظافة، مخلفات البناء والهدم المتناثرة في الطرق العامة",
  },
  {
    key: "water-sewage",
    labelAr: "تسربات المياه والصرف الصحي",
    descriptionAr: "كسر خطوط وأنابيب مياه الشرب، طفح مياه الصرف الصحي، وانسداد بالوعات تصريف الأمطار",
  },
  {
    key: "public-parks",
    labelAr: "صيانة الحدائق والمساحات الخضراء",
    descriptionAr: "تلف ألعاب الأطفال، جفاف أو سقوط الأشجار في الطرق العامة، وتلف المقاعد والمرافق بالحدائق العامة",
  },
];

/**
 * Optimizes an image buffer for multimodal AI transmission.
 * Downscales to max 1024x1024 with JPEG 75% quality to reduce network payload
 * while preserving fine details of potholes, asphalt cracks, and wiring.
 */
async function optimizeBufferForAI(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const optimized = await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return { buffer: optimized, mimeType: "image/jpeg" };
  } catch {
    return { buffer, mimeType };
  }
}

/**
 * Server-side Gemini inspection service for municipal issue validation.
 * Enforces per-image evaluation, strict classification consistency, and fail-safe routing.
 */
export async function inspectReportWithGemini(
  input: GeminiInspectionInput,
  options?: { timeoutMs?: number; apiKey?: string }
): Promise<GeminiValidationResult> {
  const start = Date.now();
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY || serverEnv.GEMINI_API_KEY;

  // Fail-safe: if no API key is configured, route to human review safely
  if (!apiKey) {
    return {
      verdict: "UNCERTAIN",
      confidence: 0.5,
      reason: "تم تحويل البلاغ للتدقيق البشري (مفتاح الفحص الذكي غير مهيأ).",
      executionTimeMs: Date.now() - start,
    };
  }

  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  const taxonomy =
    input.availableCategories && input.availableCategories.length > 0
      ? input.availableCategories
      : DEFAULT_MUNICIPAL_TAXONOMY;

  const taxonomyText = taxonomy
    .map((c) => `- "${c.key}": ${c.labelAr} (${c.descriptionAr || ""})`)
    .join("\n");

  const systemInstruction = `You are the lead municipal verification and routing engineer for Madinaty (منصة مدينتي للبلاغات البلدية).
Your job is to thoroughly inspect all uploaded photos and report content for municipal legitimacy and exact category classification.

MUNICIPAL CATEGORIES TAXONOMY (STRICT):
${taxonomyText}

CRITICAL RULES FOR MULTI-IMAGE VALIDATION:
1. Every attached photo (Image 1, Image 2, ...) must be evaluated individually.
2. A legitimate municipal issue must depict a real physical municipal defect or hazard in public infrastructure (roads, lighting, waste, water/sewage, parks).
3. IF ANY SINGLE IMAGE IS NOT A MUNICIPAL FAULT (e.g. personal selfie, car for sale, pets/animals, food/restaurant, scenery, memes, commercial ads, unrelated indoor photos):
   - You MUST set "verdict": "INVALID".
   - You MUST identify the 1-based index of every invalid image in "invalidImageIndices" (e.g. [2] or [1, 3]).
   - In "reason", specify in clear Arabic which image(s) failed and why (e.g., "الصورة رقم 2 غير مطابقة: الصورة لإعلان بيع سيارة وليست عطلاً في مرفق بلدي").
4. ONLY IF ALL attached images depict legitimate municipal issues or relevant scene context, set "verdict": "VALID".

CRITICAL RULES FOR CATEGORY CONSISTENCY:
1. Carefully match the issue depicted in the valid photo(s) with the exact taxonomy above:
   - Potholes, asphalt cracks, damaged pavements, unapproved speed bumps -> "road-hazards"
   - Street lights out, exposed electrical wires/poles -> "street-lighting"
   - Trash overflow, uncollected garbage, damaged waste bins -> "waste-management"
   - Water pipe burst, street flooding, sewage overflow, clogged drains -> "water-sewage"
   - Damaged park benches, broken playground toys, fallen trees -> "public-parks"
2. If the citizen's selected category "${input.categoryKey || ""}" matches what is shown in the image, "suggestedCategoryKey" MUST BE "${input.categoryKey || ""}".
3. If the citizen's selected category DOES NOT match what is shown in the image (e.g., citizen picked "street-lighting" but image shows a pothole or water leak):
   - "suggestedCategoryKey" MUST be the exact matching key from the taxonomy.
   - "reason" MUST clearly explain why the change is suggested (e.g., "الصورة توضح كسر ماسورة مياه وتدفقها في الشارع، لذا يتبع تصنيف تسربات المياه والصرف الصحي بدلاً من إنارة الشوارع").
4. Never invent category keys that do not exist in the taxonomy.

Respond ONLY with valid JSON in this exact structure:
{
  "verdict": "VALID" | "INVALID" | "UNCERTAIN",
  "confidence": <float between 0.0 and 1.0>,
  "reason": "<Clear Arabic explanation>",
  "suggestedCategoryKey": "<exact key from taxonomy>",
  "invalidImageIndices": [<array of numbers of invalid 1-based image indices, e.g. [2]>]
}`;

  const promptText = `عنوان البلاغ: ${input.title}
الوصف: ${input.description}
التصنيف المختار حالياً من قِبل المواطن: "${input.categoryLabel || input.categoryKey || "غير محدد"}" (المفتاح: ${input.categoryKey || "غير محدد"})`;

  // Build request parts
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: systemInstruction + "\n\n" + promptText },
  ];

  // Optimize and attach ALL images (up to 5) with clear index headers
  if (input.imageBuffers && input.imageBuffers.length > 0) {
    const imagesToScan = input.imageBuffers.slice(0, 5);
    for (let i = 0; i < imagesToScan.length; i++) {
      const img = imagesToScan[i];
      const opt = await optimizeBufferForAI(img.buffer, img.mimeType);
      parts.push({
        text: `\n--- صورة مرفقة رقم ${i + 1} (Attached Image ${i + 1}) ---`,
      });
      parts.push({
        inlineData: {
          mimeType: opt.mimeType,
          data: opt.buffer.toString("base64"),
        },
      });
    }
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  // Try candidate models in order with resilient timeouts
  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    const remainingTime = timeoutMs - (Date.now() - start);
    if (remainingTime <= 1000) break; // If less than 1s remaining, break to fail-safe

    const modelTimeout = Math.min(remainingTime, 7000); // Max 7s per model attempt
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), modelTimeout);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text();
        lastError = new Error(`Model ${model} returned ${res.status}: ${errorText}`);
        // If 503 (High Demand), 429 (Rate Limit), or 404, immediately try next candidate model
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastError = new Error(`استجابة خالية من نموذج ${model}`);
        continue;
      }

      const parsed = JSON.parse(rawText.trim());

      const validVerdict =
        parsed.verdict === "VALID" || parsed.verdict === "INVALID" || parsed.verdict === "UNCERTAIN"
          ? parsed.verdict
          : "UNCERTAIN";

      const rawIndices = Array.isArray(parsed.invalidImageIndices) ? parsed.invalidImageIndices : [];
      const invalidImageIndices: number[] = rawIndices
        .filter((n: unknown) => typeof n === "number" && n >= 1)
        .map((n: number) => Math.round(n));

      // If verdict is INVALID but model forgot to return indices, default to [1]
      if (validVerdict === "INVALID" && invalidImageIndices.length === 0) {
        invalidImageIndices.push(1);
      }

      return {
        verdict: validVerdict,
        confidence: typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.7,
        reason: parsed.reason || "تم فحص البلاغ بواسطة محرك التحقق البلدي.",
        suggestedCategoryKey: parsed.suggestedCategoryKey || input.categoryKey,
        invalidImageIndices: validVerdict === "INVALID" ? invalidImageIndices : [],
        modelUsed: model,
        executionTimeMs: Date.now() - start,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      lastError = isAbort
        ? new Error(`تجاوز النموذج ${model} الحد الزمني المسموح (${modelTimeout}ms).`)
        : (err as Error);
      // Continue to next candidate model if time permits
    }
  }

  // Fail-safe fallback (Task 3.3.3):
  return {
    verdict: "UNCERTAIN",
    confidence: 0.5,
    reason: "تم حفظ البلاغ وإحالته للتدقيق البشري نظراً لتعذر اكتمال الفحص الآلي اللحظي.",
    error: lastError?.message || "خطأ غير معروف في خدمة الفحص الذكي.",
    executionTimeMs: Date.now() - start,
  };
}
