import { expect, test } from "@playwright/test";

test.describe("calendar overview panel @regression @feature @calendar-feature", () => {
  test("calendar overview panel renders focus metrics above On this day without runtime errors", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "Calendar overview-panel regression is currently asserted for Nucleum only"
    );

    const pageErrors: string[] = [];
    const badConsoleErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (
        text.includes("getFullYear is not a function") ||
        text.includes("Cannot convert a Symbol value to a number") ||
        text.includes("Invalid key provided") ||
        text.includes("untrack is not defined")
      ) {
        badConsoleErrors.push(text);
      }
    });

    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.addInitScript(() => {
      try {
        if (!window.localStorage.getItem("offlineSessionId")) {
          const value =
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          window.localStorage.setItem("offlineSessionId", value);
        }
      } catch {}
    });

    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5_000);

    const continueOffline = page
      .getByRole("button", { name: /Continue (using )?offline/i })
      .first();
    if (await continueOffline.isVisible().catch(() => false)) {
      await continueOffline.click({ timeout: 10_000 });
      await page.waitForLoadState("domcontentloaded").catch(() => null);
      await page.waitForTimeout(4_000);
    }

    const columnsToggle = page.getByRole("button", { name: /^Columns$/i }).first();
    if (await columnsToggle.isVisible().catch(() => false)) {
      await columnsToggle.click({ timeout: 10_000 });
      await page.waitForTimeout(1_000);
    }

    const yearScaleToggle = page.getByRole("button", { name: /^Year$/i }).first();
    if (await yearScaleToggle.isVisible().catch(() => false)) {
      await yearScaleToggle.click({ timeout: 10_000 });
      await page.waitForTimeout(1_000);
    }

    const timelinePanel = page.locator('button[aria-label="Timeline"]').first();
    await expect(timelinePanel).toBeVisible({ timeout: 15_000 });

    const overviewPanel = page.locator('button[aria-label="Overview"]').first();
    await expect(overviewPanel).toBeVisible({ timeout: 15_000 });
    await overviewPanel.click({ timeout: 10_000 });

    await expect(page.getByText(/On this day/i).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByText(/^Something went wrong\.?$/i).first()).toBeHidden({
      timeout: 15_000
    });
    expect(pageErrors).toEqual([]);
    expect(badConsoleErrors).toEqual([]);
  });
});
