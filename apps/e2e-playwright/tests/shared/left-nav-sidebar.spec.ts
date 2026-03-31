import { test, expect } from "@playwright/test";
import { ensureInAppOnHome } from "../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

/**
 * All three products (nucleum, pointron, memotron) share the same left-nav strip:
 * UserBaseLayer → UserLayout → LeftNav variant="fixed" → LeftNavFixed.
 * Clicking the strip calls handleToggleMenuLabels() and switches between
 * ~5.5rem (labels visible) and ~3.5rem (icons only) widths.
 */
test.describe("shared – left nav sidebar collapse/expand @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) {
        route.abort();
        return;
      }
      route.continue();
    });
  });

  test("click left nav strip: collapses then expands back to original width", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const toggle = page.getByTestId("leftnav-sidebar-toggle");
    await expect(toggle).toBeVisible({ timeout: 15_000 });

    const readWidth = async () => {
      const box = await toggle.boundingBox();
      return box?.width ?? 0;
    };

    const w0 = await readWidth();
    expect(w0).toBeGreaterThan(0);

    // Use evaluate to fire the element's own click handler directly, avoiding
    // any child controls (e.g. the menu-settings icon) intercepting the event.
    await toggle.evaluate((el) => (el as HTMLElement).click());
    await expect
      .poll(async () => Math.abs((await readWidth()) - w0), { timeout: 8_000 })
      .toBeGreaterThan(15);

    const w1 = await readWidth();

    await toggle.evaluate((el) => (el as HTMLElement).click());
    await expect
      .poll(async () => Math.abs((await readWidth()) - w1), { timeout: 8_000 })
      .toBeGreaterThan(15);

    const w2 = await readWidth();
    // Width should return to within 12px of the original after two toggles.
    expect(Math.abs(w2 - w0)).toBeLessThan(12);
  });
});
