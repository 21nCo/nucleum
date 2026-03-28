import { expect, test } from "@playwright/test";
import {
  ensureInAppOnHome,
  LibraryTab,
  openLibraryAndTab,
  runCommand
} from "../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(runtimeEnv?.SKIP_E2E === "1", "E2E suite disabled by environment");

async function runNucleusSmokeFlow(page: import("@playwright/test").Page) {
  const taskName = `E2E smoke task ${Date.now()}`;

  await runCommand(page, "Create a new task");
  const taskNameInput = page.getByTestId("task-name-input");
  await taskNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await taskNameInput.fill(taskName);
  await page.keyboard.press("Enter");
  await taskNameInput
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(500);

  await openLibraryAndTab(page, LibraryTab.Tasks);
  await expect(
    page.getByRole("button", { name: taskName }).first()
  ).toBeVisible({
    timeout: 15_000
  });
}

async function runPointronSmokeFlow(page: import("@playwright/test").Page) {
  const goalName = `E2E smoke goal ${Date.now()}`;

  await runCommand(page, "Create a new goal");
  const goalNameInput = page.getByTestId("goal-name-input");
  await goalNameInput.waitFor({ state: "visible", timeout: 15_000 });
  await goalNameInput.fill(goalName);
  await page.keyboard.press("Enter");
  await goalNameInput
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(500);

  await openLibraryAndTab(page, LibraryTab.Goals);
  await expect(
    page.getByRole("button").filter({ hasText: goalName }).first()
  ).toBeVisible({
    timeout: 15_000
  });
}

async function runMemotronSmokeFlow(page: import("@playwright/test").Page) {
  const nodeText = `E2E smoke node ${Date.now()}`;

  await runCommand(page, "Capture");

  const editor = page
    .getByTestId("capture-editor")
    .getByPlaceholder("Start typing to capture...")
    .or(
      page
        .getByTestId("capture-editor")
        .getByRole("textbox", { name: /Markdown editor|Start typing/i })
    )
    .first();
  const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
  const editorVisible = await editor.isVisible().catch(() => false);
  if (!editorVisible) {
    await markdownBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
  }

  await editor.waitFor({ state: "visible", timeout: 8_000 });
  await editor.click();
  await page.keyboard.type(nodeText, { delay: 50 });
  await page.waitForTimeout(300);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }));
  await saveBtn.first().click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);

  const closeBtn = page.getByRole("button", { name: "Close" });
  await closeBtn.click({ timeout: 5_000 });
  await page.waitForTimeout(800);

  await openLibraryAndTab(page, LibraryTab.Nodes);
  await expect(page.getByText(nodeText, { exact: false }).first()).toBeVisible({
    timeout: 15_000
  });
}

test.describe("primary flow smoke @smoke", () => {
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

  test("core create or open flow works for the current product", async ({
    page
  }, testInfo) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);

    if (testInfo.project.name === "memotron") {
      await runMemotronSmokeFlow(page);
      return;
    }

    if (testInfo.project.name === "pointron") {
      await runPointronSmokeFlow(page);
      return;
    }

    await runNucleusSmokeFlow(page);
  });
});
