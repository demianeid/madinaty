import { test, expect } from "@playwright/test";

test.describe("Madinaty Arabic Platform & Authentication Flow", () => {
  test("renders Arabic landing page with RTL direction and emergency guidance", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify RTL document direction and Arabic language
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    // Verify Title and Headings
    await expect(page).toHaveTitle(/مدينتي/);
    await expect(page.locator("h1")).toContainText("معاً لمدينة أفضل");

    // Verify Emergency Guidance Banner (DEC-05)
    const emergencyBanner = page.locator("#emergency");
    await expect(emergencyBanner).toBeVisible();
    await expect(emergencyBanner).toContainText("الدفاع المدني: 180");
  });

  test("protects /dashboard and redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText("تسجيل الدخول إلى مدينتي");
  });

  test("validates password mismatch on registration form", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[type="text"]', "مواطن تجريبي");
    await page.fill('input[type="email"]', "test.citizen@madinaty.local");
    await page.fill('input[placeholder="8 أحرف على الأقل"]', "password123");
    await page.fill('input[placeholder="••••••••"]', "password456");
    await page.check('input[id="terms"]');

    await page.click('button[type="submit"]');

    const errorAlert = page.locator("div.bg-red-50");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("كلمتا المرور غير متطابقتين");
  });

  test("displays generic safe confirmation on forgot-password request", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.fill('input[type="email"]', "anyuser@example.com");
    await page.click('button[type="submit"]');

    const confirmation = page.locator("div.bg-emerald-50");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("تم استلام طلبك");
  });
});
