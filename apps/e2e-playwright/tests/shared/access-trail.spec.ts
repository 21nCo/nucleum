import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { DatafnSeedTransport } from "../fixtures/datafn-seed";
import { expect, test } from "../fixtures/e2e-test";
import {
  blockExternalAuthRequests,
  getLinkedNodeItem,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";
import { ensureInAppOnHome } from "../utils/helpers";
import { expectAnyLocatorVisible } from "../utils/locator-assertions";
import { resolveRepoFsImportPath } from "../utils/repo-fs";

/** Reads durable trail identity and selection without relying on shell state. */
async function readStoredTrail(page: Page) {
  return page.evaluate(async (modulePath) => {
    const { datafn } = await import(modulePath);
    const stored = await datafn.kv.get("accessTrails");
    if (!stored) return undefined;
    const current = stored.current;
    return current ? {
      ids: current.nodes.map((node: { id: string }) => node.id),
      active: current.active
    } : null;
  }, resolveRepoFsImportPath("client/datafn/datafn.store.ts"));
}

/** Opens the visible Links control across the supported record layouts. */
async function openLinks(page: Page) {
  const control = await expectAnyLocatorVisible([
    page.getByRole("tab", { name: "Links", exact: true }),
    page.getByRole("button", { name: "Links", exact: true })
  ]);
  await control.click();
}

/** Verifies the record identity and its unique visible body after navigation. */
async function expectRecord(page: Page, label: string, body: string) {
  await expect(page.getByTestId("top-bar-page-title")).toHaveText(label);
  await expect(page.locator("#mdContent")).toContainText(body);
}

test("linked record access trail preserves order and selection across reload", async ({
  page,
  seed
}, testInfo) => {
  test.skip(
    !resolveSurfaceContract(requireE2EProduct(testInfo.project.name), "library.nodes"),
    "Requires the Nodes library to follow linked records"
  );
  test.setTimeout(120_000);
  await blockExternalAuthRequests(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ensureInAppOnHome(page);
  const term = `trail${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const records = await Promise.all(
    ["A", "B", "C"].map((name) => seed.memory.node({
      label: `${term} ${name}`,
      content: `Access trail record ${name} body`
    }))
  );
  const [a, b, c] = records;
  await new DatafnSeedTransport(page, testInfo).mutate("node", [
    { operation: "relate", id: a.id, relations: {
      links: [{ $ref: b.id, fromResource: "node", toResource: "node" }]
    } },
    { operation: "relate", id: b.id, relations: {
      links: [{ $ref: c.id, fromResource: "node", toResource: "node" }]
    } }
  ], { trackInserts: false });

  await openNodeRecordFromLibraryById(page, a.id);
  await expectRecord(page, a.label, "Access trail record A body");
  for (const [record, name] of [[b, "B"], [c, "C"]] as const) {
    await openLinks(page);
    const link = getLinkedNodeItem(page, record.label);
    await expect(link).toBeVisible();
    await link.click();
    await expectRecord(page, record.label, `Access trail record ${name} body`);
  }

  await page.getByTestId("navigator-pill").click();
  const current = page.getByTestId("navigator-current-trail");
  const nodes = current.getByTestId("navigator-trail-item");
  await expect(nodes.getByRole("button")).toHaveText(records.map((record) => record.label));
  await expect(nodes.nth(0)).toHaveAttribute("data-trail-depth", "0");
  await expect(nodes.nth(1)).toHaveAttribute("data-trail-depth", "1");
  await expect(nodes.nth(2)).toHaveAttribute("data-trail-depth", "2");
  await expect(nodes.nth(2)).toHaveAttribute("data-here", "true");
  await nodes.getByRole("button", { name: b.label, exact: true }).click();
  await expectRecord(page, b.label, "Access trail record B body");
  await expect(nodes.nth(1)).toHaveAttribute("data-here", "true");

  await expect.poll(() => readStoredTrail(page), {
    message: "The stored access trail contains A, B, C with B active before reload"
  }).toEqual({ ids: records.map((record) => record.id), active: 1 });
  await page.reload();
  await expectRecord(page, b.label, "Access trail record B body");
  await expect(nodes.getByRole("button")).toHaveText(records.map((record) => record.label));
  await expect(nodes.nth(1)).toHaveAttribute("data-here", "true");
});
