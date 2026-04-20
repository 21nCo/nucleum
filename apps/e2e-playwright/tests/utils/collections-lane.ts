import { expect, type Page } from "@playwright/test";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectionSearchInput(page: Page) {
  return page.getByPlaceholder("Start searching to add to a collection").last();
}

async function collectionsLanePlusButton(page: Page) {
  const plusButtons = page.locator(
    "xpath=//button[not(@aria-label) and normalize-space()='' and .//*[local-name()='use' and contains(@href,'plus')]]"
  );
  const count = await plusButtons.count();

  for (let index = 0; index < count; index += 1) {
    const button = plusButtons.nth(index);
    const isVisible = await button.isVisible().catch(() => false);
    if (!isVisible) continue;

    const box = await button.boundingBox();
    if (!box || box.y < 80) continue;

    return button;
  }

  throw new Error("Collections lane plus button not found");
}

async function resolveCollectionsLane(page: Page) {
  const visibleInput = collectionSearchInput(page);
  const plusButtons = page.locator(
    "xpath=//button[not(@aria-label) and normalize-space()='' and .//*[local-name()='use' and contains(@href,'plus')]]"
  );
  const count = await plusButtons.count();

  for (let index = 0; index < count; index += 1) {
    const button = plusButtons.nth(index);
    const isVisible = await button.isVisible().catch(() => false);
    if (!isVisible) continue;

    const box = await button.boundingBox();
    if (!box || box.y < 80) continue;

    await button.click({ timeout: 5_000, force: true }).catch(() => null);
    const opened = await visibleInput
      .waitFor({ state: "visible", timeout: 2_000 })
      .then(() => true)
      .catch(() => false);

    if (opened) {
      return {
        button,
        input: visibleInput,
        root: button.locator(
          "xpath=ancestor::div[contains(@class,'overflow-x-auto')][1]"
        )
      };
    }

    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(250);
  }

  throw new Error("Collections lane search input did not become visible");
}

async function collectionsLaneRoot(page: Page) {
  const lane = await resolveCollectionsLane(page);
  await page.keyboard.press("Escape").catch(() => null);
  await page.waitForTimeout(250);
  return lane.root;
}

async function collectionTag(page: Page, collectionName: string) {
  const laneRoot = await collectionsLaneRoot(page);
  return laneRoot
    .locator("button[id^='collection:']")
    .filter({
      hasText: new RegExp(escapeRegex(collectionName))
    })
    .first();
}

function collectionRecordSurface(page: Page) {
  return page
    .locator("div.absolute.inset-0.flex.justify-center.w-full.h-full.bg-bgs1.z-50")
    .first();
}

export async function openCollectionsLaneSearch(page: Page) {
  const visibleInput = collectionSearchInput(page);
  if (await visibleInput.isVisible().catch(() => false)) {
    return visibleInput;
  }

  const lane = await resolveCollectionsLane(page);
  return lane.input;
}

export async function addCollectionThroughCollectionsLane(
  page: Page,
  collectionName: string
) {
  const input = await openCollectionsLaneSearch(page);
  await input.fill(collectionName);

  const result = page
    .locator("#secondary-popovers button, #popovers button")
    .filter({
      hasText: new RegExp(escapeRegex(collectionName))
    })
    .first();

  const resultVisible = await result
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => true)
    .catch(() => false);

  if (resultVisible) {
    await result.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    return;
  }

  const emptyState = page
    .locator("#secondary-popovers, #popovers")
    .getByText(/No collections found\. Press .*Enter.* to create a new collection/i)
    .first();
  await expect(emptyState).toBeVisible({ timeout: 5_000 });
  await input.press("Enter");
  await page.waitForTimeout(1_500);
}

export async function removeCollectionThroughCollectionsLane(
  page: Page,
  collectionName: string
) {
  const tag = await collectionTag(page, collectionName);

  await expect(tag).toBeVisible({ timeout: 10_000 });
  await tag.hover({ force: true });
  await page.waitForTimeout(300);

  const removeButton = tag
    .locator(
      "xpath=.//*[@role='button' or self::button][not(@aria-label) or @aria-label='Remove'][.//*[local-name()='use' and (contains(@href,'x-light') or contains(@href,'cross'))]]"
    )
    .first();

  const removeButtonVisible = await removeButton
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);

  if (removeButtonVisible) {
    await removeButton.click({ timeout: 5_000, force: true });
    await page.waitForTimeout(1_200);
    return;
  }

  const contextTargets = [
    tag,
    tag.locator("xpath=ancestor::div[1]").first(),
    tag.locator("xpath=ancestor::div[2]").first()
  ];
  const contextRemove = page.getByRole("button", { name: /^Remove$/i }).last();

  let contextMenuVisible = false;
  for (const target of contextTargets) {
    if (!(await target.isVisible().catch(() => false))) continue;
    await target.click({
      button: "right",
      timeout: 5_000,
      force: true
    }).catch(() => null);
    contextMenuVisible = await contextRemove
      .waitFor({ state: "visible", timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (contextMenuVisible) break;
  }

  await expect(contextRemove).toBeVisible({ timeout: 5_000 });
  await contextRemove.click({ timeout: 5_000 });
  await page.waitForTimeout(1_200);
}

export async function openCollectionFromCollectionsLane(
  page: Page,
  collectionName: string
) {
  const tag = await collectionTag(page, collectionName);
  await expect(tag).toBeVisible({ timeout: 10_000 });
  await tag.click({ timeout: 5_000, force: true });
  await page.waitForTimeout(1_400);
}

export async function expectCollectionRecordOpenedFromLane(
  page: Page,
  collectionName: string
) {
  const recordSurface = collectionRecordSurface(page);
  await expect(recordSurface).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      () => {
        const resource = new URL(page.url()).searchParams.get("r");
        return resource?.startsWith("collection:") ?? false;
      },
      { timeout: 10_000 }
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
  await expect(await collectionTag(page, collectionName)).toBeVisible({
    timeout: 10_000
  });
}

export async function expectCollectionTagAbsent(
  page: Page,
  collectionName: string
) {
  await expect
    .poll(
      async () =>
        (await collectionTag(page, collectionName)).isVisible().catch(() => false),
      { timeout: 10_000 }
    )
    .toBe(false);
}
