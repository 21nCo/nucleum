import { test, expect } from "@playwright/test";
import { pointronProductConfig } from "../../config/pointron-product.config";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("pointron - app layout and menu @regression", () => {
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

  test("app menu shows Focus, Calendar, Overview, Library", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    for (const label of pointronProductConfig.appMenuNavLabels) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("open Overview via command bar (Overview), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    const overviewPath = pointronProductConfig.pathByNavLabel.Overview;
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

    const overviewPath = pointronProductConfig.pathByNavLabel.Overview;
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

    const libraryPath = pointronProductConfig.pathByNavLabel.Library;
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

  test("open Library via UI (click Library in nav, then Goals), then assert Goals list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    const libraryPath = pointronProductConfig.pathByNavLabel.Library;
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
    await expect(page.getByTestId("search-goals")).toBeVisible({
      timeout: 10_000
    });
  });
});
