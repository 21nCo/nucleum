import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { ensureInAppOnHome } from "../utils/helpers";
import { blockExternalAuthRequests } from "../memory/memory-test-helpers";

/** Checks the visible identity and controls hosted for the active record. */
async function expectRecordContext(page: Page, label: string) {
  const zone = page.getByTestId("top-bar-context-zone");
  await expect(zone.getByTestId("top-bar-page-title")).toHaveText(label);
  await expect(zone.getByTestId("resource-context-tabs")).toBeVisible();
  await expect(zone.getByTestId("resource-record-context-menu")).toBeVisible();
}

/** Opens the active record's menu and checks its visible starred indicator. */
async function expectStarred(page: Page, isStarred: boolean) {
  await page
    .getByTestId("top-bar-context-zone")
    .getByTestId("resource-record-context-menu")
    .click();
  const star = page.locator(".popover [data-context-menu-item-id='star']");
  await expect(star).toBeVisible();
  if (isStarred) {
    await expect(star).toContainText("Starred");
  } else {
    await expect(star).not.toContainText("Starred");
  }
  await page.keyboard.press("Escape");
  await expect(star).toBeHidden();
}

test("context zone follows pointer and keyboard pane focus and stars only the focused record @record-page", async ({
  page,
  seed
}, testInfo) => {
  test.skip(
    !resolveSurfaceContract(
      requireE2EProduct(testInfo.project.name),
      "library.nodes"
    ),
    "This workflow uses the product's node record controls"
  );
  test.setTimeout(120_000);
  await blockExternalAuthRequests(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ensureInAppOnHome(page);
  const [first, second] = await seed.memory.nodes(2, {
    prefix: "E2E pane focus"
  });
  const route = `/calendar?${new URLSearchParams({
    page: first.id,
    besidePage: second.id
  })}`;
  await page.goto(route);

  const firstPane = page.locator("[data-context-zone-pane='page']");
  const secondPane = page.locator("[data-context-zone-pane='besidePage']");
  const firstContent = firstPane.locator("#mdContent");
  const secondContent = secondPane.locator("#mdContent");
  await expect(firstContent).toContainText(first.label);
  await expect(secondContent).toContainText(second.label);

  await firstContent.getByText(first.label, { exact: true }).click();
  await expectRecordContext(page, first.label);
  await expectStarred(page, false);

  await secondContent.getByText(second.label, { exact: true }).click();
  await expectRecordContext(page, second.label);
  await expectStarred(page, false);

  await firstContent.getByText(first.label, { exact: true }).click();
  await expectRecordContext(page, first.label);
  const zone = page.getByTestId("top-bar-context-zone");
  await zone.getByTestId("resource-record-context-menu").click();
  const star = page.locator(".popover [data-context-menu-item-id='star']");
  await expect(star).toBeVisible();
  await star.click();
  await expectStarred(page, true);

  await secondContent.getByText(second.label, { exact: true }).click();
  await expectRecordContext(page, second.label);
  await expectStarred(page, false);

  const focusFirst = zone.getByRole("button", {
    name: `Focus pane: ${first.label}`,
    exact: true
  });
  await focusFirst.focus();
  await expect(focusFirst).toBeFocused();
  await page.keyboard.press("Enter");
  await expectRecordContext(page, first.label);
  await expectStarred(page, true);

  const focusSecond = zone.getByRole("button", {
    name: `Focus pane: ${second.label}`,
    exact: true
  });
  await focusSecond.focus();
  await expect(focusSecond).toBeFocused();
  await page.keyboard.press("Enter");
  await expectRecordContext(page, second.label);
  await expectStarred(page, false);

  await page.reload();
  await expect(firstContent).toContainText(first.label);
  await expect(secondContent).toContainText(second.label);
  await firstContent.getByText(first.label, { exact: true }).click();
  await expectRecordContext(page, first.label);
  await expectStarred(page, true);
  await secondContent.getByText(second.label, { exact: true }).click();
  await expectRecordContext(page, second.label);
  await expectStarred(page, false);
});
