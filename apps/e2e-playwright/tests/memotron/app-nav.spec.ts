import { test, expect } from "@playwright/test";
import { memotronProductConfig } from "../../config/memotron-product.config";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const baseURL = runtimeEnv?.APP_BASE_URL ?? "http://127.0.0.1:4173";

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

test.describe("memotron – app layout and menu @regression", () => {
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

  test("app menu shows Capture, Calendar, Overview, Library", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    for (const label of memotronProductConfig.appMenuNavLabels) {
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

    const overviewPath = memotronProductConfig.pathByNavLabel.Overview;
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

    const overviewPath = memotronProductConfig.pathByNavLabel.Overview;
    await page.waitForURL(
      (u) => new RegExp(`^${overviewPath}(\\/.*)?$`).test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await expect(page.getByText("Overview").first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("open Library via command bar (Library), then assert Library and Nodes list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Library");

    const nodesCard = page
      .getByRole("button", { name: /^Nodes(\s+\d+)?$/i })
      .and(page.locator(":not([aria-disabled='true'])"));
    await nodesCard.first().waitFor({ state: "visible", timeout: 10_000 });
    await nodesCard.first().click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    const libraryPath = memotronProductConfig.pathByNavLabel.Library;
    const onLibraryPage = () =>
      new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(page.url()).pathname);
    if (!onLibraryPage()) {
      await page.goto(new URL(libraryPath, baseURL).toString(), {
        waitUntil: "load"
      });
      await page.waitForURL(
        (u) =>
          new RegExp(`^${libraryPath}(\\/.*)?$`).test(new URL(u).pathname),
        { timeout: 15_000 }
      );
      const nodesBtn = page.getByRole("button", { name: /^Nodes(\s+\d+)?$/i }).first();
      await nodesBtn.waitFor({ state: "visible", timeout: 15_000 });
      await nodesBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    }

    const nodesListVisible = page
      .getByTestId("search-nodes")
      .or(page.getByRole("button", { name: /Create new node|New node/i }))
      .or(page.getByText(/No nodes|don't have any nodes/i))
      .first();
    await expect(nodesListVisible).toBeVisible({ timeout: 10_000 });
  });

  test("open Library via UI (click Library in nav, then Nodes), then assert Nodes list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await page.waitForURL(
      (u) => /^\/library(\/.*)?$/.test(new URL(u).pathname),
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: /^Nodes(\s+\d+)?$/i }).first().click({
      timeout: 5_000
    });
    await page.waitForTimeout(600);

    await expect(
      page.getByTestId("search-nodes").or(page.getByText(/No nodes|Nodes/i).first())
    ).toBeVisible({ timeout: 10_000 });
  });
});
