import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import {
  ensureInAppOnHome,
  navigateToSurface,
  runCommand
} from "../../utils/helpers";
import { openResourceRecord } from "../../utils/resource-matrix";
import { readPersistedSession } from "../active-session/session-test-support";
import {
  blockGoogleAccountsNavigation,
  openQuickFocusPanelViaTopNav,
  readSessionRuntime,
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
  const objectiveTitle = page.getByTestId("objective-context-title");
  await expect(objectiveTitle).toBeVisible({ timeout: 15_000 });
  await expect(objectiveTitle).toHaveText(objective.label);
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

  const objectiveTitle = page.getByTestId("objective-context-title");
  await expect(objectiveTitle).toBeVisible();
  await expect(objectiveTitle).toHaveText(objectiveName);
  await objectiveTitle.click();
  await expect(page.getByTestId("objective-context-title-input")).toBeVisible({
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
    .getByTestId("resource-record-surface")
    .locator('[style*="--customcolor"]')
    .first();
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
  const sessionId = (await readSessionRuntime(page)).currentSessionId;
  expect(sessionId, "the running focus session has an id").toBeTruthy();
  await finishCurrentFocus(page);
  await expect
    .poll(
      async () => {
        const { logs, session } = await readPersistedSession(page, sessionId!);
        return (
          Boolean(session?.endUnix) &&
          logs.some((log) => log.objectiveId === objective.id)
        );
      },
      {
        message:
          "objective color: the finished focus session and its objective log are persisted before opening analytics",
        timeout: 15_000
      }
    )
    .toBe(true);
  await expect(page.locator("#SESSION_FINISHED")).toBeHidden({
    timeout: 10_000
  });

  await navigateToSurface(page, "overview.focus", testInfo.project.name);
  const analyticsColorScope = page
    .getByText(objectiveName, { exact: true })
    .locator(
      "xpath=ancestor::span[contains(@class, 'items-center')][1]/*[contains(@style, '--customcolor')]"
    );
  await expect(analyticsColorScope).toBeVisible({ timeout: 10_000 });
  await expect(analyticsColorScope).toHaveCSS("--customcolor", persistedColor, {
    timeout: 10_000
  });
});
