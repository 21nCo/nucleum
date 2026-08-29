import { expect, type Locator, type Page } from "@playwright/test";
import { expectAnyLocatorVisible } from "./locator-assertions";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectionSearchInput(page: Page) {
  return page.getByPlaceholder("Start searching to add to a collection").last();
}

function collectionsLaneRoot(page: Page) {
  return page.getByTestId("collections-lane").filter({ visible: true }).first();
}

function collectionTag(page: Page, collectionName: string): Locator {
  return collectionsLaneRoot(page)
    .getByTestId(/^link-item:/)
    .filter({ hasText: new RegExp(escapeRegex(collectionName), "i") })
    .first();
}

export async function openCollectionsLaneSearch(page: Page) {
  const input = collectionSearchInput(page);
  if (await input.isVisible().catch(() => false)) return input;

  const lane = collectionsLaneRoot(page);
  await expect(lane).toBeVisible({ timeout: 10_000 });
  await lane.getByTestId("collections-lane-add").click({ timeout: 5_000 });
  await expect(input).toBeVisible({ timeout: 5_000 });
  return input;
}

export async function addCollectionThroughCollectionsLane(
  page: Page,
  collectionName: string
) {
  const input = await openCollectionsLaneSearch(page);
  await input.fill(collectionName);

  const result = page
    .getByTestId("link-search-result")
    .filter({ visible: true })
    .filter({ hasText: new RegExp(escapeRegex(collectionName), "i") })
    .first();
  const emptyState = page.getByText(
    /No collections found\. Press .*Enter.* to create a new collection/i
  );
  await expectAnyLocatorVisible([result, emptyState], {
    message: "collection search resolves to a result or its empty state",
    timeout: 10_000
  });

  if (await result.isVisible().catch(() => false)) {
    await result.click({ timeout: 5_000 });
  } else {
    await expect(emptyState).toBeVisible();
    await input.press("Enter");
  }

  await expect(collectionTag(page, collectionName)).toBeVisible({
    timeout: 10_000
  });
}

export async function removeCollectionThroughCollectionsLane(
  page: Page,
  collectionName: string,
  removalMode: "inline" | "context-menu" = "inline"
) {
  const tag = collectionTag(page, collectionName);
  await expect(tag).toBeVisible({ timeout: 10_000 });
  const action = tag.getByTestId(/^tag:/);

  if (removalMode === "context-menu") {
    await action.click({ button: "right", timeout: 5_000 });
    const removeAction = page
      .locator('[data-context-menu-item-id="delete"]')
      .filter({ visible: true });
    await expect(removeAction).toBeVisible({ timeout: 5_000 });
    await removeAction.click({ timeout: 5_000 });
  } else {
    await action.hover();
    await tag.getByTestId(/^tag-remove:/).click({ timeout: 5_000 });
  }

  await expect(tag).toBeHidden({ timeout: 10_000 });
}

export async function openCollectionFromCollectionsLane(
  page: Page,
  collectionName: string
) {
  const tag = collectionTag(page, collectionName);
  await expect(tag).toBeVisible({ timeout: 10_000 });
  await tag.getByTestId(/^tag:/).click({ timeout: 5_000 });
}

export async function expectCollectionRecordOpenedFromLane(
  page: Page,
  collectionName: string
) {
  const recordSurface = page.getByTestId("resource-record-surface");
  await expect(recordSurface).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      () => {
        const resource = new URL(page.url()).searchParams.get("r");
        return resource?.startsWith("collection:") ?? false;
      },
      {
        message: "expectCollectionRecordOpenedFromLane: toBe true",
        timeout: 10_000
      }
    )
    .toBe(true);
  await expect(recordSurface.getByText(collectionName).first()).toBeVisible({
    timeout: 15_000
  });
}

export async function expectCollectionTagVisible(
  page: Page,
  collectionName: string
) {
  await expect(collectionTag(page, collectionName)).toBeVisible({
    timeout: 10_000
  });
}

export async function expectCollectionTagAbsent(
  page: Page,
  collectionName: string
) {
  await expect(collectionTag(page, collectionName)).toBeHidden({
    timeout: 10_000
  });
}
