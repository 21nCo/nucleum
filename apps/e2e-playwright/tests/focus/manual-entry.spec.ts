import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";
import type { Page } from "@playwright/test";
import {
  blockGoogleAccountsNavigation,
  openFocusViaTopNav
} from "./focus-test-helpers";

let e2eSeed: E2ESeed;

async function fillManualLogEntryAndSave(page: Page, objectiveName: string) {
  const objectiveInput = page.getByPlaceholder(
    "Start typing to select objective"
  );
  await objectiveInput.waitFor({ state: "visible", timeout: 10_000 });
  await objectiveInput.fill(objectiveName);
  await expect(
    page.getByText(objectiveName, { exact: true }).last()
  ).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Enter");

  const quickDurationBtn = page
    .getByRole("button", { name: /last\s+10\s*min/i })
    .first();
  const hasQuick = await quickDurationBtn
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (hasQuick)
    await quickDurationBtn.click({ timeout: 2_000 }).catch(() => null);

  await page
    .locator("button")
    .filter({ hasText: /Save entries/i })
    .click({ timeout: 5_000 });
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("via command bar (Manual time entry → objective + duration → save), then assert in Logs @smoke", async ({
  page
}) => {
  test.setTimeout(60_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E manual entry ${Date.now()}`;

  await e2eSeed.focus.objective({ label: objectiveName });

  await runCommand(page, "Manual time entry");
  await expect(page.getByText("Manual time entry").first()).toBeVisible({
    timeout: 10_000
  });
  await fillManualLogEntryAndSave(page, objectiveName);

  await runCommand(page, "See Logs");
  await expect(page.getByText("Logs").first()).toBeVisible({
    timeout: 10_000
  });
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({
    timeout: 10_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await runCommand(page, "See Logs");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 10_000 });
});

test("via UI (Focus → Add manual log → objective + duration → save), then assert in Logs @smoke", async ({
  page
}) => {
  test.setTimeout(60_000);
  await ensureInAppOnHome(page);

  const objectiveName = `E2E manual UI ${Date.now()}`;

  await e2eSeed.focus.objective({ label: objectiveName });

  await openFocusViaTopNav(page);
  await page
    .getByRole("button", { name: /Add manual log/i })
    .click({ timeout: 10_000 });
  await expect(page.getByText("Manual time entry").first()).toBeVisible({
    timeout: 10_000
  });
  await fillManualLogEntryAndSave(page, objectiveName);

  await runCommand(page, "See Logs");
  await expect(page.getByText("Logs").first()).toBeVisible({
    timeout: 10_000
  });
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({
    timeout: 10_000
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await runCommand(page, "See Logs");
  await expect(
    page.getByText(objectiveName, { exact: true }).first()
  ).toBeVisible({ timeout: 10_000 });
});
