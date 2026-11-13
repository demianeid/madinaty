import { describe, it, expect, vi } from "vitest";
import { inspectReportWithGemini } from "@/lib/ai/gemini";

describe("Gemini AI Inspection Service & Fail-Safe Fallbacks (Epic 3.3)", () => {
  it("returns UNCERTAIN with safe review routing when API key is missing", async () => {
    const result = await inspectReportWithGemini(
      {
        title: "هبوط أسفلتي في الطريق",
        description: "حفرة عميقة في الشارع أمام المجمع الخدمي",
        categoryKey: "road-hazards",
      },
      { apiKey: "" }
    );

    expect(result.verdict).toBe("UNCERTAIN");
    expect(result.confidence).toBe(0.5);
    expect(result.reason).toContain("تدقيق");
  });

  it("safely falls back to UNCERTAIN and human review when request times out", async () => {
    const result = await inspectReportWithGemini(
      {
        title: "أعطال إنارة",
        description: "أعمدة الإنارة مطفأة بالكامل في الشارع الرئيسي",
        categoryKey: "street-lighting",
      },
      { apiKey: "mock-key", timeoutMs: 1 } // 1ms forces timeout abort
    );

    expect(result.verdict).toBe("UNCERTAIN");
    expect(result.confidence).toBe(0.5);
    expect(result.reason).toContain("تدقيق");
    expect(result.error).toBeDefined();
  });

  it("handles structured AI output correctly when mock fetch returns valid response", async () => {
    const mockJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  verdict: "VALID",
                  confidence: 0.95,
                  reason: "البلاغ يتعلق بحفرة وتلف إسفلتي في طريق عام وهو من صلب اختصاصات البلدية.",
                  suggestedCategoryKey: "road-hazards",
                }),
              },
            ],
          },
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJson,
      text: async () => JSON.stringify(mockJson),
    } as unknown as Response);

    try {
      const result = await inspectReportWithGemini(
        {
          title: "حفرة عميقة في الأسفلت",
          description: "حفرة تعيق حركة السيارات في الشارع",
          categoryKey: "road-hazards",
        },
        { apiKey: "mock-key" }
      );

      expect(result.verdict).toBe("VALID");
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toContain("البلاغ يتعلق بحفرة");
      expect(result.suggestedCategoryKey).toBe("road-hazards");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles INVALID detection correctly with clear Arabic explanation", async () => {
    const mockJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  verdict: "INVALID",
                  confidence: 0.98,
                  reason: "المحتوى إعلان تجاري خاص لبيع سلع ولا يمثل مشكلة بنية تحتية أو مرفق بلدي.",
                  suggestedCategoryKey: "other",
                }),
              },
            ],
          },
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJson,
      text: async () => JSON.stringify(mockJson),
    } as unknown as Response);

    try {
      const result = await inspectReportWithGemini(
        {
          title: "بيع سيارة مستعملة",
          description: "سيارة للبيع بحالة ممتازة",
        },
        { apiKey: "mock-key" }
      );

      expect(result.verdict).toBe("INVALID");
      expect(result.confidence).toBe(0.98);
      expect(result.reason).toContain("إعلان تجاري");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("handles 503 high demand by trying candidate fallback models and returning UNCERTAIN without crashing", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Model is experiencing high demand",
    } as unknown as Response);

    try {
      const result = await inspectReportWithGemini(
        {
          title: "تسريب مياه",
          description: "كسر في ماسورة مياه رئيسية",
        },
        { apiKey: "mock-key" }
      );

      // Fail-safe guarantee: Never throw error to caller; return UNCERTAIN with human review routing
      expect(result.verdict).toBe("UNCERTAIN");
      expect(result.confidence).toBe(0.5);
      expect(result.reason).toContain("تدقيق");
      expect(result.error).toContain("503");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("identifies specific invalid image index in multi-image scan", async () => {
    const mockJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  verdict: "INVALID",
                  confidence: 0.96,
                  reason: "الصورة رقم 2 غير مطابقة: الصورة تظهر حيوان أليف وليست عطلاً بلدياً.",
                  suggestedCategoryKey: "waste-management",
                  invalidImageIndices: [2],
                }),
              },
            ],
          },
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJson,
      text: async () => JSON.stringify(mockJson),
    } as unknown as Response);

    try {
      const result = await inspectReportWithGemini(
        {
          title: "تراكم قمامة",
          description: "قمامة متراكمة في شارع الحي",
          categoryKey: "waste-management",
          imageBuffers: [
            { buffer: Buffer.from("image1"), mimeType: "image/jpeg" },
            { buffer: Buffer.from("image2"), mimeType: "image/jpeg" },
          ],
        },
        { apiKey: "mock-key" }
      );

      expect(result.verdict).toBe("INVALID");
      expect(result.invalidImageIndices).toEqual([2]);
      expect(result.reason).toContain("الصورة رقم 2");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("suggests consistent category key from municipal taxonomy when mismatch detected", async () => {
    const mockJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  verdict: "VALID",
                  confidence: 0.94,
                  reason: "الصورة توضح كسر ماسورة مياه وتدفقها في الشارع، لذا يتبع تصنيف تسربات المياه والصرف الصحي بدلاً من إنارة الشوارع.",
                  suggestedCategoryKey: "water-sewage",
                }),
              },
            ],
          },
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockJson,
      text: async () => JSON.stringify(mockJson),
    } as unknown as Response);

    try {
      const result = await inspectReportWithGemini(
        {
          title: "ماسورة مكسورة",
          description: "مياه تغرق الطريق بالكامل",
          categoryKey: "street-lighting",
          availableCategories: [
            { key: "street-lighting", labelAr: "إنارة الشوارع" },
            { key: "water-sewage", labelAr: "تسربات المياه والصرف الصحي" },
            { key: "road-hazards", labelAr: "أعطال الطرق والأسفلت" },
          ],
        },
        { apiKey: "mock-key" }
      );

      expect(result.verdict).toBe("VALID");
      expect(result.suggestedCategoryKey).toBe("water-sewage");
      expect(result.reason).toContain("تسربات المياه والصرف الصحي");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
