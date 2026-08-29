import { test, expect } from "@playwright/test";

import { ensureInAppOnHome } from "../utils/helpers";

test.describe("smoke @smoke", () => {
  test("home page loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await ensureInAppOnHome(page);
    await expect(page).toHaveURL(/\//);
    expect(errors).toHaveLength(0);
  });
});
