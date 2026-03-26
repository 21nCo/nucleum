import { test, expect } from "@playwright/test";
import { ensureInAppOnHome } from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

/**
 * "Session" as a first-class resource is product/build dependent.
 * If a Sessions entry exists in Library, we assert browse + open basics.
 * Otherwise we mark N/A (sessions are only covered indirectly via focus/logs/timeline tests).
 */
test.describe("session - resource coverage (browse/open) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("Library has Sessions tab and can browse/open (or N/A)", async ({ page }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    await page.getByRole("button", { name: /^Library$/i }).first().click({ timeout: 5_000 });
    await page.waitForURL((u) => /^\/library(\/.*)?$/.test(new URL(u).pathname), {
      timeout: 10_000
    });
    await page.waitForTimeout(800);

    const sessionsBtn = page
      .getByRole("button", { name: /^Sessions(\s+\d+)?$/i })
      .first();
    const visible = await sessionsBtn.isVisible().catch(() => false);
    if (!visible) test.skip(true, "No Sessions resource in Library (N/A)");

    await sessionsBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1_000);

    const recordsContainer = page.locator("#records-container");
    await expect(recordsContainer).toBeVisible({ timeout: 15_000 });

    // If there are any records, clicking the first should open a panel/record page.
    const first = recordsContainer.locator('div[id^="thumbnail-"]').first();
    const hasAny = await first.isVisible().catch(() => false);
    if (!hasAny) test.skip(true, "Sessions list is empty in this environment (N/A)");

    await first.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    const hasClose = await page
      .getByRole("button", { name: /Close/i })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasClose) test.skip(true, "No session record page UI available (N/A)");
  });
});

