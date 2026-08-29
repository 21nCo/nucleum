import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  navigateToSurface,
  runCommand
} from "../../utils/helpers";
import { openResourceRecord } from "../../utils/resource-matrix";
import {
  blockGoogleAccountsNavigation,
  openQuickFocusPanelViaTopNav,
  waitForSessionElapsed
} from "../focus-test-helpers";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

async function openObjectiveFromLibrary(
  page: Page,
  objective: { id: string; label: string }
) {
  await openResourceRecord(page, test.info().project.name, "objective", {
    id: objective.id
  });
  await expect(
    page.getByRole("heading", { name: objective.label }).first()
  ).toBeVisible({ timeout: 15_000 });
}

async function readCustomColor(locator: Locator) {
  const color = await locator.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--customcolor").trim()
  );
  expect(color).not.toBe("");
  return color;
}

async function finishCurrentFocus(page: Page) {
  await runCommand(page, "Finish the current session");
  await page
    .getByText("Finish", { exact: true })
    .last()
    .click({ timeout: 5_000 });
  await page.getByRole("button", { name: /^Done/i }).click({ timeout: 5_000 });
}

test("objective color persists and is reused on detail, Quick Focus, and analytics surfaces", async ({
  page
}, testInfo) => {
  test.setTimeout(150_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E objective color ${Date.now()}`;
  const targetHue = "212";
  const objective = await e2eSeed.focus.objective({ label: objectiveName });
  await openObjectiveFromLibrary(page, objective);

  await page.getByRole("heading", { name: objectiveName }).click();
  await expect(page.getByTestId("objective-name-input")).toBeVisible({
    timeout: 10_000
  });

  const colorControl = page.getByText("Color", { exact: true }).locator("..");
  await colorControl.getByRole("button").click({ timeout: 5_000 });
  const hueSlider = page.locator('input[type="range"]:visible');
  await expect(hueSlider).toBeVisible({ timeout: 10_000 });
  await hueSlider.fill(targetHue);
  await expect(hueSlider).toHaveValue(targetHue);
  await expect(page.getByText("Color updated", { exact: true })).toBeVisible({
    timeout: 10_000
  });

  await openObjectiveFromLibrary(page, objective);
  const detailColorScope = page
    .getByRole("heading", { name: objectiveName })
    .locator("xpath=ancestor::*[contains(@style, '--customcolor')][1]");
  const persistedColor = await readCustomColor(detailColorScope);

  const { quickFocusPanel, quickFocusSearch } =
    await openQuickFocusPanelViaTopNav(page);
  await quickFocusSearch.fill(objectiveName);
  const quickFocusObjective = quickFocusPanel
    .getByRole("button")
    .filter({ hasText: objectiveName })
    .first();
  await expect(quickFocusObjective).toBeVisible({ timeout: 15_000 });
  const quickFocusColorScope = quickFocusObjective.locator(
    '[style*="--customcolor"]'
  );
  await expect(quickFocusColorScope).toHaveCount(1);
  expect(await readCustomColor(quickFocusColorScope)).toBe(persistedColor);

  await quickFocusObjective.click({ timeout: 5_000 });
  await waitForSessionElapsed(page, 2);
  await finishCurrentFocus(page);

  await navigateToSurface(page, "overview.focus", testInfo.project.name);
  const analyticsColorScope = page
    .getByText(objectiveName, { exact: true })
    .locator(
      "xpath=ancestor::span[contains(@class, 'items-center')][1]/*[contains(@style, '--customcolor')]"
    );
  await expect(analyticsColorScope).toBeVisible({ timeout: 10_000 });
  expect(await readCustomColor(analyticsColorScope)).toBe(persistedColor);
});
