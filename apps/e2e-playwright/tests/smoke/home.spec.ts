import { test, expect } from "@playwright/test";

import { AppPage } from "../../pages/app.page";

test.skip(
  process.env.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("smoke", () => {
  test("home page loads without errors", async ({ page }) => {
    const app = new AppPage(page);
    await app.gotoHome();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\//);
    await expect(page.locator("body div").first()).toBeVisible();
  });
});
