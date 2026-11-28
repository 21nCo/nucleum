import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { requireE2EProduct, resolveSurfaceContract } from "../../config/e2e.config";
import { DatafnSeedTransport } from "../fixtures/datafn-seed";
import { expect, test } from "../fixtures/e2e-test";
import { ensureInAppOnHome } from "../utils/helpers";
import { blockExternalAuthRequests } from "../memory/memory-test-helpers";

/** Selects a visible search result with arrows without assuming type ranking. */
async function selectResultWithArrows(page: Page, label: string) {
  const input = page.getByTestId("navigator-search-input");
  const results = page.getByTestId("navigator-search-result");
  const target = results.filter({ hasText: label });
  await expect(target).toBeVisible();
  await expect(results.first()).toHaveAttribute("data-active", "true");
  const labels = await results.allTextContents();
  const targetIndex = labels.findIndex((text) => text.includes(label));
  await input.press("ArrowUp");
  for (let index = 0; index <= targetIndex; index += 1) {
    await input.press("ArrowDown");
  }
  await expect(target).toHaveAttribute("data-active", "true");
  await expect(input).toBeFocused();
}

test("navigator finds two resource types, opens a keyboard selection, and opens the other result beside it", async ({
  page,
  seed
}, testInfo) => {
  const product = requireE2EProduct(testInfo.project.name);
  const hasTasks = !!resolveSurfaceContract(product, "library.tasks");
  const hasNodes = !!resolveSurfaceContract(product, "library.nodes");
  const hasObjectives = !!resolveSurfaceContract(product, "library.objectives");
  const hasCollections = !!resolveSurfaceContract(product, "library.collections");
  test.skip(
    !(hasTasks || hasCollections) || !(hasNodes || hasObjectives) || (!hasTasks && !hasNodes),
    "Requires two searchable resource types with product surface contracts"
  );
  test.setTimeout(120_000);
  await blockExternalAuthRequests(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ensureInAppOnHome(page);
  const term = `nav${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const noteBody = "A note opened from a cross-type navigator search";
  const primaryRecord = hasTasks
    ? await seed.focus.task({ label: `${term} task` })
    : await seed.collections.collection({ label: `${term} collection` });
  const besideRecord = hasNodes
    ? await seed.memory.node({ label: `${term} note`, content: noteBody })
    : await seed.focus.objective({ label: `${term} objective` });
  if (!hasNodes) {
    await new DatafnSeedTransport(page, testInfo).mutate("objective", {
      operation: "merge",
      id: besideRecord.id,
      record: { description: { blocks: [{
        id: `block:${randomUUID()}`,
        body: noteBody,
        contentType: "SIMPLE_TEXT"
      }] } }
    }, { trackInserts: false });
  }

  await page.getByTestId("navigator-pill").click();
  const input = page.getByTestId("navigator-search-input");
  await expect(input).toBeVisible();
  await input.fill(term);
  const results = page.getByTestId("navigator-search-result");
  await expect(results.filter({ hasText: besideRecord.label })).toBeVisible();
  await expect(results.filter({ hasText: primaryRecord.label })).toBeVisible();
  await selectResultWithArrows(page, primaryRecord.label);
  await input.press("Enter");

  const pagePane = page.locator("[data-context-zone-pane='page']");
  const primaryIdentity = hasTasks
    ? pagePane.getByTestId("task-name-input")
    : pagePane.getByText(primaryRecord.label, { exact: true });
  await expect(primaryIdentity).toBeVisible();
  if (hasTasks) await expect(primaryIdentity).toHaveValue(primaryRecord.label);
  else await expect(primaryIdentity).toHaveText(primaryRecord.label);
  await expect(page.locator("[data-context-zone-pane='besidePage']")).toHaveCount(0);

  await expect(input).toBeVisible();
  await input.fill("");
  await expect(results).toHaveCount(0);
  await input.fill(term);
  await expect(results.filter({ hasText: besideRecord.label })).toBeVisible();
  await expect(results.filter({ hasText: primaryRecord.label })).toBeVisible();
  await selectResultWithArrows(page, besideRecord.label);
  await input.press("ControlOrMeta+Enter");

  const besidePane = page.locator("[data-context-zone-pane='besidePage']");
  await expect(besidePane.locator("#mdContent")).toBeVisible();
  await expect(besidePane.locator("#mdContent")).toContainText(noteBody);
  await expect(primaryIdentity).toBeVisible();
  if (hasTasks) await expect(primaryIdentity).toHaveValue(primaryRecord.label);
  else await expect(primaryIdentity).toHaveText(primaryRecord.label);
  await besidePane.getByText(noteBody, { exact: true }).click();
  await expect(
    page.getByTestId("top-bar-context-zone").getByTestId("top-bar-page-title")
  ).toHaveText(besideRecord.label);
});
