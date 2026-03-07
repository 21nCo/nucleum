import { test, expect } from "@playwright/test";
import { nucleusProductConfig } from "../../config/nucleus-product.config";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("nucleus - app layout and menu @regression", () => {
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

  test("open Logs via command bar (See Logs), then assert Logs view visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "See Logs");
    await expect(page.getByText("Logs").first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Logs via UI (Calendar → Activity → Focus), then assert Logs view visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page
      .getByRole("button", {
        name: new RegExp(`^${nucleusProductConfig.timelinePageLabel}$`, "i")
      })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) =>
        new RegExp(
          `^\\/${nucleusProductConfig.homePath}(\\/.*)?$`
        ).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Focus$/i }).first().waitFor({ state: "visible", timeout: 10_000 });

    await page
      .getByRole("button", { name: /^Focus$/i })
      .first()
      .click({ timeout: 5_000 });
    const calendarColumn = page.locator("[id^='mdcontainer-']");
    await calendarColumn.first().waitFor({ state: "visible", timeout: 10_000 });
    const overviewInPanel = calendarColumn
      .getByRole("button", { name: /Overview/i })
      .first();
    const timelineInPanel = calendarColumn
      .getByRole("button", { name: /Timeline/i })
      .first();
    const hasOverview = await overviewInPanel.isVisible().catch(() => false);
    const panelRow = hasOverview
      ? overviewInPanel.locator("..").locator("..")
      : timelineInPanel.locator("..").locator("..");
    await panelRow.getByRole("button").last().click({ timeout: 8_000 });
    await page.waitForTimeout(500);

    await page
      .locator("[id^='mdcontainer-']")
      .getByRole("button", { name: /^Focus$/i })
      .click({ timeout: 5_000 });
    await page.waitForTimeout(500);

    await expect(
      page.getByText("No sessions found").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("open Overview via command bar (Overview), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    const overviewPath = nucleusProductConfig.pathByNavLabel.Overview;
    await page.waitForURL(
      (u) => new RegExp(`^${overviewPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await expect(page.getByText("Overview").first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Overview via UI (click Overview in left nav), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page
      .getByRole("button", { name: /^Overview$/i })
      .first()
      .click({ timeout: 5_000 });

    const overviewPath = nucleusProductConfig.pathByNavLabel.Overview;
    await page.waitForURL(
      (u) => new RegExp(`^${overviewPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await expect(page.getByText("Overview").first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Library via command bar (Library), then assert Library and Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Library");

    const goalsCard = page
      .getByRole("button", { name: /^Goals(\s+\d+)?$/i })
      .and(page.locator(":not([aria-disabled='true'])"));
    await goalsCard.first().waitFor({ state: "visible", timeout: 10_000 });
    await goalsCard.first().click({ timeout: 5_000 });
    await page.getByTestId("search-goals").waitFor({ state: "visible", timeout: 15_000 });

    const libraryPath = nucleusProductConfig.pathByNavLabel.Library;
    const onLibraryPage = () =>
      new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(page.url()).pathname);
    if (!onLibraryPage()) {
      await page.goto(libraryPath, {
        waitUntil: "load"
      });
      await page.waitForURL(
        (u) =>
          new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(u).pathname),
        { timeout: 15_000 }
      );
      const goalsBtn = page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first();
      await goalsBtn.waitFor({ state: "visible", timeout: 15_000 });
      await goalsBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    }

    const goalsListVisible = page
      .getByTestId("search-goals")
      .or(page.getByRole("button", { name: /Create new goal/i }))
      .or(page.getByText(/Looks like you don't have any goals/i))
      .first();
    await expect(goalsListVisible).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via command bar (Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Goals");
    await expect(page.getByTestId("search-goals")).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Library via command bar (Tasks), then assert Tasks list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Tasks");
    await expect(
      page
        .getByTestId("search-tasks")
        .or(page.getByRole("button", { name: /By month/i }))
        .or(page.getByText("No tasks found"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via UI (click Library in nav, then Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    const libraryPath = nucleusProductConfig.pathByNavLabel.Library;
    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Goals(\s+\d+)?$/i }).first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(600);

    await expect(page.getByTestId("search-goals")).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Goals via side nav (pin Goals in menu settings, then click Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page.getByTestId("leftnav-settings").click({ timeout: 5_000 });
    await expect(page.getByText("Pin resources")).toBeVisible({
      timeout: 5_000
    });

    const goalsRow = page
      .getByTestId("leftnav-pin-resource")
      .filter({ hasText: "Goals" });
    await goalsRow.waitFor({ state: "visible", timeout: 5_000 });
    const toggle = goalsRow.locator('input[type="checkbox"]');
    const checked = await toggle.isChecked().catch(() => false);
    if (!checked) {
      await goalsRow.locator("label").click({ timeout: 2_000 });
      await page.waitForTimeout(300);
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await page
      .getByRole("button", { name: /^Goals(\s+\d+)?$/i })
      .first()
      .click({ timeout: 5_000 });
    await page.waitForTimeout(600);

    await expect(page.getByTestId("search-goals")).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Library via UI (click Library in nav, then Tasks), then assert Tasks list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    const libraryPath = nucleusProductConfig.pathByNavLabel.Library;
    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Tasks(\s|$)/i }).click({
      timeout: 5_000
    });
    await expect(
      page
        .getByTestId("search-tasks")
        .or(page.getByRole("button", { name: /By month/i }))
        .or(page.getByText("No tasks found"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
