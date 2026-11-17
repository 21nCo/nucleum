import type { Page, TestInfo } from "@playwright/test";

import { DatafnSeedTransport } from "../../fixtures/datafn-seed";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome, LibraryTab } from "../../utils/helpers";
import { resolveRepoFsImportPath } from "../../utils/repo-fs";
import {
  blockExternalAuthRequests,
  openNodesLibrary
} from "../memory-test-helpers";

let e2eSeed: E2ESeed;

const spaceStorePath = resolveRepoFsImportPath(
  "client/features/spaces/space.store.ts"
);
const navigationPath = resolveRepoFsImportPath(
  "client/shell/navigation/navigation.ts"
);
const datafnStorePath = resolveRepoFsImportPath(
  "client/datafn/datafn.store.ts"
);

/**
 * Whether the app server serves repo source modules, as the Vite dev server
 * does; a static build answers those imports with HTML.
 */
async function isRepoSourceServed(page: Page) {
  const response = await page.request.get(spaceStorePath);
  return (
    response.ok() &&
    /javascript/.test(response.headers()["content-type"] ?? "")
  );
}

/** Inserts an empty side nav space and opens it as the page. */
async function openEmptySpace(page: Page) {
  const spaceId = await page.evaluate(
    async ({ spaceStorePath, navigationPath }) => {
      const { insertSpace } = await import(spaceStorePath);
      const { navigation } = await import(navigationPath);
      const id = await insertSpace({
        label: `E2E item keys space ${Date.now()}`,
        items: []
      });
      if (id) navigation.openResource(id, "page");
      return id as string | undefined;
    },
    { spaceStorePath, navigationPath }
  );
  expect(spaceId).toBeTruthy();
  return spaceId as string;
}

async function deleteSpace(page: Page, spaceId: string) {
  await page.evaluate(
    async ({ datafnStorePath, spaceId }) => {
      const { datafn } = await import(datafnStorePath);
      await datafn.space.mutate({ operation: "delete", id: spaceId });
    },
    { datafnStorePath, spaceId }
  );
}

const highlighted = (page: Page) =>
  page.locator("[id^='thumbnail-'][data-item-highlighted]");

async function openSeededLibrary(page: Page) {
  await ensureInAppOnHome(page);
  await e2eSeed.memory.nodes(3, { prefix: "E2E item keys node" });
  await openNodesLibrary(page);
  await expect(
    page.locator("[id^='thumbnail-'][data-id]").filter({
      hasText: "E2E item keys node"
    })
  ).toHaveCount(3, { timeout: 20_000 });
}

/**
 * Seeds a node collection holding three seeded nodes and opens it. The
 * relations go away with the records the seed fixture deletes.
 */
async function openSeededNodeCollection(page: Page, testInfo: TestInfo) {
  await ensureInAppOnHome(page);
  const nodes = await e2eSeed.memory.nodes(3, {
    prefix: "E2E collection item keys node"
  });
  const collection = await e2eSeed.collections.collection({
    prefix: "E2E item keys collection",
    resource: "node"
  });
  await new DatafnSeedTransport(page, testInfo).mutate(
    "node",
    nodes.map((node, index) => ({
      operation: "relate" as const,
      id: node.id,
      relations: {
        collections: [
          { $ref: collection.id, fromResource: "node", sortOrder: index }
        ]
      }
    })),
    { trackInserts: false }
  );
  await page.goto(
    `/collection_browse?selected=${encodeURIComponent(
      collection.id
    )}&selectedAt=${Date.now()}`,
    { waitUntil: "domcontentloaded" }
  );
  const items = page
    .locator("[id^='thumbnail-'][data-id]")
    .filter({ hasText: "E2E collection item keys node" });
  await expect(items).toHaveCount(3, { timeout: 20_000 });
  return nodes.map((node) => node.id);
}

async function highlightedId(page: Page) {
  await expect(highlighted(page)).toHaveCount(1);
  return (await highlighted(page).getAttribute("data-id")) ?? "";
}

test.describe("nodes - item keys", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("arrow keys move a highlight and Enter opens the item", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    const first = await highlightedId(page);
    await page.keyboard.press("ArrowRight");
    await expect(highlighted(page)).not.toHaveAttribute("data-id", first);
    await page.keyboard.press("ArrowLeft");
    await expect(highlighted(page)).toHaveAttribute("data-id", first);

    await page.keyboard.press("Enter");
    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 20_000
    });
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(first)));
    await expect(highlighted(page)).toHaveCount(0);
  });

  test("arrow keys reach the list while the Library tab that opened it keeps focus", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    const nodesTab = page
      .getByRole("tab", { name: LibraryTab.Nodes })
      .or(page.getByRole("button", { name: LibraryTab.Nodes }))
      .first();
    await nodesTab.click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !!document.activeElement &&
            document.activeElement !== document.body
        )
      )
      .toBe(true);

    await page.keyboard.press("ArrowDown");
    const first = await highlightedId(page);
    await page.keyboard.press("ArrowRight");
    await expect(highlighted(page)).not.toHaveAttribute("data-id", first);
  });

  test("Space and Shift arrows add to the selection, and Escape clears the selection before the highlight", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByText(/Selected: 1 node/i)).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.getByText(/Selected: 3 nodes/i)).toBeVisible({
      timeout: 10_000
    });

    await page.keyboard.press("Escape");
    await expect(page.getByText(/Selected: \d+ nodes?/i)).toBeHidden({
      timeout: 10_000
    });
    await expect(highlighted(page)).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(highlighted(page)).toHaveCount(0);
  });

  test("period opens the highlighted item's menu and the menu works from the keyboard", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await openSeededLibrary(page);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(".");
    const select = page.getByRole("button", { name: "Select", exact: true });
    await expect(select).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press("ArrowDown");
    await expect(select).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(select).toBeHidden({ timeout: 10_000 });
    await expect(highlighted(page)).toHaveCount(1);

    await page.keyboard.press(".");
    await expect(select).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Selected: 1 node/i)).toBeVisible({
      timeout: 10_000
    });
  });

  test("arrow keys on a menu's option radios pick the option, and Escape closes the menu", async ({
    page
  }) => {
    test.setTimeout(90_000);
    test.skip(
      !(await isRepoSourceServed(page)),
      "The space setup imports repo source modules, which only the Vite dev server serves"
    );
    await ensureInAppOnHome(page);
    const spaceId = await openEmptySpace(page);
    try {
      const trigger = page.getByTestId("space-actions-menu");
      await trigger.click({ timeout: 20_000 });
      const menu = page.locator("#spaceContextZoneMenu");
      const sideNav = menu.locator("[role='radio'][data-option-value='sidenav']");
      const wall = menu.locator("[role='radio'][data-option-value='wall']");
      await expect(sideNav).toHaveAttribute("aria-checked", "true");

      await sideNav.focus();
      await page.keyboard.press("ArrowDown");
      await expect(wall).toHaveAttribute("aria-checked", "true");
      await expect(wall).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await expect(sideNav).toHaveAttribute("aria-checked", "true");
      await expect(sideNav).toBeFocused();

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    } finally {
      await deleteSpace(page, spaceId);
    }
  });

  test("arrow keys, Space and Enter work in a node collection's list", async ({
    page
  }, testInfo) => {
    test.setTimeout(90_000);
    const nodeIds = await openSeededNodeCollection(page, testInfo);

    await page.keyboard.press("ArrowDown");
    const first = await highlightedId(page);
    expect(nodeIds).toContain(first);
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page)).not.toHaveAttribute("data-id", first);
    await page.keyboard.press("ArrowUp");
    await expect(highlighted(page)).toHaveAttribute("data-id", first);

    await page.keyboard.press("Space");
    await expect(page.getByText(/Selected: 1 node/i)).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("Shift+ArrowDown");
    await expect(page.getByText(/Selected: 2 nodes/i)).toBeVisible({
      timeout: 10_000
    });
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Selected: \d+ nodes?/i)).toBeHidden({
      timeout: 10_000
    });
    await expect(highlighted(page)).toHaveCount(1);

    await page.keyboard.press("ArrowUp");
    await expect(highlighted(page)).toHaveAttribute("data-id", first);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(first)), {
      timeout: 20_000
    });
    await expect(highlighted(page)).toHaveCount(0);
  });
});
