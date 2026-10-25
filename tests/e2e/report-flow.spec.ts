import { test, expect } from "@playwright/test";

test.describe("Citizen Report Creation & Lifecycle Journey", () => {
  test("redirects unauthenticated user accessing /reports/new to login", async ({
    page,
  }) => {
    await page.goto("/reports/new");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("citizen can log in, create a new report, receive reference, and view detail timeline", async ({
    page,
  }) => {
    // 1. Login with seeded citizen credentials
    await page.goto("/login");
    await page.fill('input[type="email"]', "citizen@madinaty.local");
    await page.fill('input[type="password"]', "Password1234!");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /أهلاً بك/ })).toBeVisible({ timeout: 15000 });

    // 2. Navigate to report creation page
    await page.goto("/reports/new");
    await expect(page.getByRole("heading", { name: /تسجيل بلاغ/ })).toBeVisible({ timeout: 15000 });

    // 3. Fill in report details
    await page.fill('input[placeholder*="مثال:"]', "هبوط إسفلتي عميق في التقاطع الرئيسي");
    await page.fill(
      'textarea[placeholder*="صف المشكلة بدقة"]',
      "يوجد هبوط أرضي وحفرة عميقة في الأسفلت أمام المجمع الخدمي تعيق حركة المرور وتسبب خطراً على المركبات."
    );
    await page.fill('input[placeholder*="اسم الشارع"]', "شارع الأمل، الحي السكني الثاني");

    // 4. Submit form
    await page.click('button:has-text("إرسال البلاغ الآن")');

    // 5. Expect success card with generated public reference MD-XXXX-XXXX
    await expect(page.getByRole("heading", { name: /تم استلام بلاغك بنجاح/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=MD-")).toBeVisible();

    // 6. Click to navigate to report details
    await page.click('a:has-text("متابعة تفاصيل البلاغ")');

    // 7. Verify report details page
    await expect(page.getByRole("heading", { name: /هبوط إسفلتي عميق/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=جديد").first()).toBeVisible();
    await expect(page.locator("text=سجل المراحل والتدقيق الميداني")).toBeVisible();
    await expect(page.locator("text=تقديم البلاغ من قبل المواطن")).toBeVisible();
  });
});
