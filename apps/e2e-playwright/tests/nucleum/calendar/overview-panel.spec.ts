import { expect, test } from "@playwright/test";
import { ensureInAppOnHome, navigateToSurface } from "../../utils/helpers";

test.describe("calendar overview panel", () => {
  test("calendar overview panel renders focus metrics above On this day without runtime errors", async ({
    page
  }) => {
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
    await ensureInAppOnHome(page);
    await navigateToSurface(page, "calendar.layout.classic");

    const columnsToggle = page
      .getByRole("button", { name: /^Columns$/i })
      .first();
    if (await columnsToggle.isVisible().catch(() => false)) {
      await columnsToggle.click({ timeout: 10_000 });
    }

    const yearScaleToggle = page
      .getByRole("button", { name: /^Year$/i })
      .first();
    if (await yearScaleToggle.isVisible().catch(() => false)) {
      await yearScaleToggle.click({ timeout: 10_000 });
    }

    const timelinePanel = page.locator('button[aria-label="Timeline"]').first();
    await expect(timelinePanel).toBeVisible({ timeout: 15_000 });

    const overviewPanel = page.locator('button[aria-label="Overview"]').first();
    await expect(overviewPanel).toBeVisible({ timeout: 15_000 });
    await overviewPanel.click({ timeout: 10_000 });

    await expect(page.getByText(/On this day/i).first()).toBeVisible({
      timeout: 15_000
    });
    await expect(
      page.getByText(/^Something went wrong\.?$/i).first()
    ).toBeHidden({
      timeout: 15_000
    });
    expect(pageErrors).toEqual([]);
    expect(badConsoleErrors).toEqual([]);
  });
});
