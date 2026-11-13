import sharp from "sharp";
import { inspectReportWithGemini } from "../lib/ai/gemini";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Helper to create synthetic labeled image buffers for testing
async function createTestImage(text: string, color: string, width = 400, height = 300): Promise<Buffer> {
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <circle cx="${width/2}" cy="${height/2}" r="80" fill="rgba(0,0,0,0.3)"/>
      <text x="50%" y="45%" font-size="20" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">
        ${safeText}
      </text>
      <text x="50%" y="60%" font-size="14" fill="#f1f5f9" text-anchor="middle" font-family="Arial, sans-serif">
        Madinaty Test Inspection
      </text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 بدء اختبار فحص الذكاء الاصطناعي (Gemini) على عينات أعطال بلدية وغير أعطال");
  console.log("================================================================================\n");

  const testCases = [
    {
      category: "عطل بلدي (Road Hazard)",
      title: "هبوط أرضي وتصدع أسفلتي عميق أمام مدرسة الحي",
      description: "توجد حفرة كبيرة بعمق 25 سم وتشققات واسعة في الأسفلت تعيق حركة السير وتشكل خطراً جسيماً على المارة والمركبات.",
      categoryKey: "road-hazards",
      imageText: "Pothole & Broken Asphalt Hazard",
      bgColor: "#334155",
    },
    {
      category: "عطل بلدي (Waste Management)",
      title: "تراكم كثيف للقمامة ومخلفات البناء حول الحاويات",
      description: "حاويات القمامة ممتلئة تماماً والنفايات متناثرة في الشارع وتسبب روائح كريهة وانسداد ممر المشاة.",
      categoryKey: "waste-management",
      imageText: "Overflowing Garbage & Waste",
      bgColor: "#713f12",
    },
    {
      category: "عطل بلدي (Water & Sewage Leak)",
      title: "انفجار خط مياه رئيسي وغرق الشارع",
      description: "كسر مفاجئ في ماسورة مياه الشرب أسفل الرصيف وتدفق المياه بغزارة مما تسبب في هبوط التربة وتجمع برك مياه.",
      categoryKey: "water-sewage",
      imageText: "Broken Water Pipe & Street Flood",
      bgColor: "#1e3a8a",
    },
    {
      category: "غير عطل (Commercial / Car Sale)",
      title: "سيارة هيونداي النترا بحالة الوكالة للبيع",
      description: "سيارة موديل 2022 فابريكا بالكامل ماشية 40 ألف كيلو للتواصل والاستفسار السعر 600 ألف.",
      categoryKey: "road-hazards", // Deliberately selected wrong municipal category
      imageText: "Used Car For Sale 600K",
      bgColor: "#b91c1c",
    },
    {
      category: "غير عطل (Personal / Pet / Cat)",
      title: "قطة شيرازي ضائعة في الحديقة",
      description: "وجدت قطة أليفة بيضاء اللون لطيفة جداً تبحث عن صاحبها يرجى النشر في الجروب.",
      categoryKey: "public-parks",
      imageText: "Cute White Pet Cat",
      bgColor: "#0f766e",
    },
    {
      category: "غير عطل (Food / Beverage)",
      title: "فنجان قهوة الصباح وتجربة مطعم",
      description: "تقييم لمقهى الحي الجديد القهوة ممتازة والخدمة سريعة أنصح بتجربته.",
      categoryKey: "road-hazards",
      imageText: "Coffee Cup & Breakfast Meal",
      bgColor: "#854d0e",
    },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[الحالة ${i + 1}/${testCases.length}] - فئة الاختبار: [${tc.category}]`);
    console.log(`📌 العنوان: "${tc.title}"`);
    console.log(`📝 الوصف: "${tc.description}"`);

    const imageBuffer = await createTestImage(tc.imageText, tc.bgColor);

    const start = Date.now();
    const result = await inspectReportWithGemini(
      {
        title: tc.title,
        description: tc.description,
        categoryKey: tc.categoryKey,
        imageBuffers: [{ buffer: imageBuffer, mimeType: "image/jpeg" }],
      },
      { timeoutMs: 15000 }
    );
    const duration = Date.now() - start;

    console.log(`🤖 القرار (Verdict): \x1b[1m${result.verdict}\x1b[0m (نسبة الثقة: ${(result.confidence * 100).toFixed(0)}%)`);
    console.log(`💡 التعليل والسبب: ${result.reason}`);
    console.log(`🏷️ التصنيف المقترح: ${result.suggestedCategoryKey || "بدون"}`);
    console.log(`⏱️ وقت الاستجابة: ${duration}ms (النموذج: ${result.modelUsed || "الافتراضي"})`);
    console.log("--------------------------------------------------------------------------------\n");
  }

  console.log("✅ اكتمل الاختبار الشامل بنجاح!");
}

runTestSuite().catch(console.error);
