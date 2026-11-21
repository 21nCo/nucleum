import { test, expect, type Page } from "@playwright/test";
import { Product } from "@nucleum/client/config/product.type";
import { Action } from "@nucleum/client/config/action.enum";
import {
  assertAppMenuVisible,
  ensureInAppOnHome,
  runCommand
} from "../utils/helpers";

async function expectNodesLibrary(page: Page) {
  const libraryPath = `/${Action.LIBRARY}`;
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === libraryPath || url.pathname.startsWith(`${libraryPath}/`)
  );
  await expect(
    page.getByRole("tab", { name: "Nodes", selected: true })
  ).toBeVisible();
  await expect(page.getByTestId("search-nodes")).toBeVisible();
}

test.describe("memotron - app layout and menu", () => {
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
    await assertAppMenuVisible(page, Product.MEMOTRON);
  });

  test("open Overview via command bar (Overview), then assert Overview page visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);
    await runCommand(page, "Overview");

    await expect(page).toHaveURL(
      (url) => url.pathname === `/${Action.OVERVIEW}/graph`
    );
    await expect(
      page.getByRole("tab", { name: "Graph", selected: true })
    ).toBeVisible();
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

    const overviewPath = `/${Action.OVERVIEW}`;
    await page.waitForURL(
      (u) =>
        new RegExp(String.raw`^${overviewPath}(/.*)?$`).test(
          new URL(u).pathname
        ),
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
    await expectNodesLibrary(page);
  });

  test("open Library via side navigation, then assert Nodes list visible", async ({
    page
  }) => {
    test.setTimeout(45_000);
    await ensureInAppOnHome(page);

    await page
      .getByRole("button", { name: /^Library$/i })
      .click({ timeout: 5_000 });
    await expectNodesLibrary(page);
  });
});
