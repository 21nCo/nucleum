import { test, expect } from "@playwright/test";

import { AppPage } from "../../pages/app.page";

test.skip(
  process.env.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("regression", () => {
  test("primary navigation is visible", async ({ page }) => {
    const app = new AppPage(page);
    await app.gotoHome();

    const navVisible = await app.isNavigationVisible();
    expect(navVisible).toBe(true);
  });
});
