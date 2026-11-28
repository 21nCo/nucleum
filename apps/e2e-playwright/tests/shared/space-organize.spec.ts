import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { requireE2EProduct, resolveSurfaceContract } from "../../config/e2e.config";
import { expect, test } from "../fixtures/e2e-test";
import { blockExternalAuthRequests } from "../memory/memory-test-helpers";
import { ensureInAppOnHome, runCommand } from "../utils/helpers";
import { resolveRepoFsImportPath } from "../utils/repo-fs";

/** Removes the UI-created space and its app-menu pin after the workflow. */
async function deleteSpace(page: Page, spaceId: string) {
  await page.evaluate(
    async ({ datafnPath, menuPath, spaceId }) => {
      const { datafn } = await import(datafnPath);
      const { appMenuStore } = await import(menuPath);
      appMenuStore.unpinSpace(spaceId);
      await datafn.space.mutate({ operation: "delete", id: spaceId });
    },
    {
      datafnPath: resolveRepoFsImportPath("client/datafn/datafn.store.ts"),
      menuPath: resolveRepoFsImportPath("client/shell/navigation/app-menu.store.ts"),
      spaceId
    }
  );
}

test("create a space, organize two resource types, rename and pin it, and retain everything after reload", async ({
  page,
  seed
}, testInfo) => {
  test.setTimeout(120_000);
  await blockExternalAuthRequests(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ensureInAppOnHome(page);
  const product = requireE2EProduct(testInfo.project.name);
  const eligibleResources = await page.evaluate(async ({ modulePath, product }) => {
    const { resolveSpaceItemResources } = await import(modulePath);
    return resolveSpaceItemResources(product) as string[];
  }, {
    modulePath: resolveRepoFsImportPath("client/features/spaces/space.utils.ts"),
    product
  });
  const resourceTypes = ([
    ["node", "library.nodes"],
    ["objective", "library.objectives"],
    ["collection", "library.collections"],
    ["space", null]
  ] as const).filter(([resource, surface]) =>
    eligibleResources.includes(resource) && (!surface || resolveSurfaceContract(product, surface))
  ).map(([resource]) => resource).slice(0, 2);
  test.skip(resourceTypes.length < 2, "Requires two space-eligible resource types with product surface contracts");
  const term = `space${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const initialName = `${term} workspace`;
  const renamedName = `${term} organized`;
  const records: { id: string; label: string }[] = [];
  const seededSpaceIds: string[] = [];
  let spaceId: string | null = null;
  try {
    for (const resource of resourceTypes) {
      const label = `${term} ${resource}`;
      if (resource === "node") records.push(await seed.memory.node({ label }));
      else if (resource === "objective") records.push(await seed.focus.objective({ label }));
      else if (resource === "collection") records.push(await seed.collections.collection({ label }));
      else {
        const id = await page.evaluate(async ({ modulePath, label }) => {
          const { insertSpace } = await import(modulePath);
          return await insertSpace({ label, items: [] }) as string;
        }, { modulePath: resolveRepoFsImportPath("client/features/spaces/space.store.ts"), label });
        seededSpaceIds.push(id);
        records.push({ id, label });
      }
    }
    await runCommand(page, "Create a new space");
    const nameInput = page.getByTestId("space-title-input");
    await expect(nameInput).toBeVisible();
    spaceId = new URL(page.url()).searchParams.get("page");
    await nameInput.fill(initialName);
    await nameInput.press("Enter");
    const title = page.getByTestId("top-bar-page-title");
    await expect(title).toHaveText(initialName);
    const sideNav = page.getByTestId("space-sidenav");
    await expect(sideNav.getByText("No items yet", { exact: true })).toBeVisible();
    await sideNav.getByTestId("space-edit").click();
    const addPanel = sideNav.getByRole("region", { name: "Add to space", exact: true });
    const search = addPanel.getByRole("searchbox", { name: "Search records to add" });
    const items = sideNav.getByRole("navigation", { name: "Space items", exact: true });
    for (const record of records) {
      await search.fill(record.label);
      const result = addPanel.getByTestId("space-picker-result").filter({ hasText: record.label });
      await expect(result).toBeVisible();
      await result.click();
      await expect(items.getByRole("button", { name: record.label, exact: true })).toBeVisible();
      await expect(search).toHaveValue("");
    }
    await sideNav.getByTestId("space-edit").click();
    await expect(addPanel).toBeHidden();

    const actions = page.getByTestId("space-actions-menu");
    await actions.click();
    await page.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(renamedName);
    await nameInput.press("Enter");
    await expect(title).toHaveText(renamedName);
    await actions.click();
    await page.getByRole("button", { name: "Pin to app menu", exact: true }).click();
    const pinned = page.getByTestId("app-menu-pinned-spaces").getByRole("button", { name: renamedName, exact: true });
    await expect(pinned).toBeVisible();

    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(sideNav).toBeHidden();
    await pinned.click();
    await expect(title).toHaveText(renamedName);
    await expect(pinned).toHaveAttribute("aria-current", "page");
    for (const record of records) {
      await expect(items.getByRole("button", { name: record.label, exact: true })).toBeVisible();
    }

    await page.reload();
    await expect(pinned).toBeVisible();
    await pinned.click();
    await expect(title).toHaveText(renamedName);
    await expect(pinned).toHaveAttribute("aria-current", "page");
    for (const record of records) {
      await expect(items.getByRole("button", { name: record.label, exact: true })).toBeVisible();
    }
  } finally {
    if (spaceId) await deleteSpace(page, spaceId);
    for (const id of seededSpaceIds) await deleteSpace(page, id);
  }
});
