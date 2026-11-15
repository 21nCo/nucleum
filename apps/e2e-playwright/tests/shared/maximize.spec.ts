import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { ensureInAppOnHome } from "../utils/helpers";
import { getResourceThumbnail } from "../utils/resource-matrix";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById,
  openNodesLibrary
} from "../memory/memory-test-helpers";

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

/** Inserts a side nav space listing `nodes` and opens it as the page. */
async function openSideNavSpace(
  page: Page,
  nodes: { id: string; label: string }[]
) {
  const spaceId = await page.evaluate(
    async ({ spaceStorePath, navigationPath, nodes }) => {
      const { insertSpace } = await import(spaceStorePath);
      const { navigation } = await import(navigationPath);
      const id = await insertSpace({
        label: `E2E maximize space ${Date.now()}`,
        items: nodes.map((node, index) => ({
          id: `e2e-space-item-${index}`,
          type: "resource",
          label: node.label,
          resourceId: node.id,
          resourceType: "node"
        }))
      });
      if (id) navigation.openResource(id, "page");
      return id as string | undefined;
    },
    { spaceStorePath, navigationPath, nodes }
  );
  expect(spaceId).toBeTruthy();
  return spaceId as string;
}

/**
 * Opens the full screen item of an actions menu. Retries the menu, since a
 * resource that is still loading can take focus and close it.
 */
async function openFullScreenMenuItem(page: Page, actions: Locator) {
  const item = page.locator(
    '[data-context-menu-item-id="open-in-full-screen"]'
  );
  await expect(async () => {
    if (!(await item.isVisible())) await actions.click({ timeout: 5_000 });
    await expect(item).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return item;
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

test.describe("maximize", () => {
  test.beforeEach(async ({ page, seed }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The maximized page is a node opened from the Nodes library, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "Seeding and the space setup import repo source modules, which only the Vite dev server serves"
    );
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("a maximized page keeps a minimal top bar and Minimize restores it", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E maximize ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);

    const tabs = page.getByTestId("resource-context-tabs");
    await expect(tabs).toBeVisible({ timeout: 15_000 });
    await expect(tabs.getByRole("button", { name: /maximize/i })).toHaveCount(
      0
    );

    await tabs.getByRole("button", { name: "Actions" }).click();
    await page
      .locator('[data-context-menu-item-id="open-in-full-screen"]')
      .click();

    const minimize = page.getByTestId("top-bar-close");
    await expect(minimize).toHaveAttribute("aria-label", "Minimize");
    await expect(page.getByRole("button", { name: "Command bar" })).toHaveCount(
      0
    );
    await expect(page.getByTestId("top-bar-indicators")).toHaveCount(0);
    await expect(page.getByTestId("resource-context-tabs")).toBeVisible();

    await minimize.click();
    await expect(page).not.toHaveURL(/[?&]max=/);
    await expect(page.getByTestId("resource-record-surface")).toBeVisible();
    await expect(page.getByTestId("top-bar-close")).toHaveAttribute(
      "aria-label",
      "Close"
    );
    await expect(
      page.getByRole("button", { name: "Command bar" })
    ).toBeVisible();
  });

  test("Minimize returns a page opened straight into full screen to where it was opened from", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E maximize origin ${Date.now()}`
    });
    await openNodesLibrary(page);
    const origin = page.url();
    expect(origin).not.toMatch(/[?&]page=/);

    await getResourceThumbnail(page, node.id).click({
      modifiers: ["Shift"],
      timeout: 5_000
    });
    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 15_000
    });
    await expect(page).toHaveURL(/[?&]max=/);
    const minimize = page.getByTestId("top-bar-close");
    await expect(minimize).toHaveAttribute("aria-label", "Minimize");

    await minimize.click();
    await expect(page).toHaveURL(origin);
    await expect(page.getByTestId("resource-record-surface")).toHaveCount(0);
    await expect(getResourceThumbnail(page, node.id)).toBeVisible();
  });

  const minimizeWays: [string, (page: Page) => Promise<void>][] = [
    [
      "the top-left button",
      (page) => page.getByTestId("top-bar-close").click()
    ],
    [
      "the actions menu",
      async (page) => {
        const minimize = await openFullScreenMenuItem(
          page,
          page
            .getByTestId("resource-context-tabs")
            .getByRole("button", { name: "Actions" })
        );
        await expect(minimize).toContainText("Minimize");
        await minimize.click();
      }
    ],
    ["Escape", (page) => page.keyboard.press("Escape")]
  ];

  for (const [way, minimizeWith] of minimizeWays) {
    test(`Minimize with ${way} returns an item maximized from a space to the space with its side nav`, async ({
      page
    }) => {
      test.setTimeout(150_000);
      await ensureInAppOnHome(page);
      const nodes = await e2eSeed.memory.nodes(2, {
        prefix: "E2E maximize space item"
      });
      const spaceId = await openSideNavSpace(page, nodes);
      try {
        const sideNav = page.getByTestId("space-sidenav");
        await expect(sideNav).toBeVisible({ timeout: 15_000 });
        const item = sideNav
          .getByTestId("space-nav-tree")
          .getByRole("button", { name: nodes[1].label, exact: true });
        await item.click();
        await expect(item).toHaveAttribute("aria-current", "true");
        const spaceUrl = page.url();

        const maximize = await openFullScreenMenuItem(
          page,
          page
            .getByTestId("space-content")
            .getByTestId("resource-record-context-menu")
        );
        await expect(maximize).toContainText("Maximize");
        await maximize.click();
        await expect
          .poll(() => new URL(page.url()).searchParams.get("page"))
          .toBe(nodes[1].id);
        await expect(page.getByTestId("space-sidenav")).toHaveCount(0);
        const minimize = page.getByTestId("top-bar-close");
        await expect(minimize).toHaveAttribute("aria-label", "Minimize");

        await minimizeWith(page);
        await expect(page).toHaveURL(spaceUrl);
        await expect(page.getByTestId("space-sidenav")).toBeVisible();
        await expect(item).toHaveAttribute("aria-current", "true");
        await expect(page.locator('[data-full-screen="true"]')).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Command bar" })
        ).toBeVisible();
      } finally {
        await deleteSpace(page, spaceId);
      }
    });
  }
});
