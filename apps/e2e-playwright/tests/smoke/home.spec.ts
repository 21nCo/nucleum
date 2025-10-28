import { test, expect } from "@playwright/test";

import { AppPage } from "../../pages/app.page";

test.skip(process.env.SKIP_E2E === "1", "E2E suite disabled by environment");

test.describe("smoke", () => {
  test("home page loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const app = new AppPage(page);
    const response = await app.gotoHome();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\//);
    expect(errors).toHaveLength(0);
  });
});
