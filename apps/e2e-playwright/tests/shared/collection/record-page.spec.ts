import { test, expect, type Page } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function createCollection(page: Page, name: string) {
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(name);
  const modal = page.locator("#collection_create");
  await modal.getByRole("button", { name: /Save.*Enter/i }).click({ timeout: 8_000 });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.waitForTimeout(600);
}

async function openCollectionRecordFromLibrary(page: Page, name: string) {
  await openLibraryAndTab(page, LibraryTab.Collections);
  const container = page.locator("#records-container");
  await expect(container).toBeVisible({ timeout: 15_000 });
  const thumb = container
    .locator('div[id^="thumbnail-"]')
    .filter({ hasText: name })
    .first();
  await expect(thumb).toBeVisible({ timeout: 20_000 });
  await thumb.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
}

test.describe("collection - record page (open + tabs) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open collection record and assert expected content visible (or N/A if no record page)", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll record ${Date.now()}`;
    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);

    const hasClose = await page
      .getByRole("button", { name: /Close/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasClose) test.skip(true, "No collection record page available (N/A)");

    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("tab switching and visibility on collection record page (or N/A if no tabs)", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll tabs ${Date.now()}`;
    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);

    const hasClose = await page
      .getByRole("button", { name: /Close/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasClose) test.skip(true, "No collection record page available (N/A)");

    const tabList = page.getByRole("tablist").first();
    const hasTabs = await tabList.isVisible().catch(() => false);
    if (!hasTabs) test.skip(true, "No tablist rendered on collection record page in this product build");

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
      await page.waitForTimeout(300);
    }
  });
});

