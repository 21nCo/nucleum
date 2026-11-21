import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { openResourceRecord } from "../../utils/resource-matrix";
import { blockGoogleAccountsNavigation } from "../focus-test-helpers";

async function selectHiddenView(
  page: Page,
  label: string,
  input: "mouse" | "keyboard"
) {
  const tabs = page.getByTestId("resource-context-tabs");
  await expect(tabs.getByRole("tab", { name: label, exact: true })).toHaveCount(
    0
  );
  const more = page.getByTestId("switcher-more");
  if (input === "mouse") {
    await more.click();
  } else {
    await more.focus();
    await page.keyboard.press("Enter");
  }
  const items = page.locator(".popover button.contextmenuitem");
  const target = items.filter({ has: page.getByText(label, { exact: true }) });
  await expect(target).toBeVisible();
  if (input === "mouse") {
    await target.click();
  } else {
    for (let step = 0; step < (await items.count()); step++) {
      await page.keyboard.press("ArrowDown");
      if (
        await target.evaluate((element) => element === document.activeElement)
      ) {
        break;
      }
    }
    await expect(target).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(items).toHaveCount(0);
  await expect(
    tabs.getByRole("tab", { name: label, exact: true })
  ).toHaveAttribute("aria-selected", "true");
}

test("objective overflow supports mouse and keyboard views and durable record actions", async ({
  page,
  seed
}, testInfo) => {
  test.setTimeout(120_000);
  await blockGoogleAccountsNavigation(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureInAppOnHome(page);
  const objective = await seed.focus.objective({
    prefix: "E2E objective overflow"
  });
  await openResourceRecord(page, testInfo.project.name, "objective", objective);
  const title = page.getByTestId("objective-context-title");
  const more = page.getByTestId("switcher-more");
  const actions = page.getByTestId("resource-record-context-menu");
  await expect(title).toHaveText(objective.label);
  await expect(more).toHaveCount(0);
  await expect(actions).toBeVisible();

  await page.setViewportSize({ width: 990, height: 900 });
  await expect(more).toBeVisible();
  await selectHiddenView(page, "Activity", "mouse");
  await selectHiddenView(page, "Analytics", "keyboard");
  await expect(actions).toHaveCount(0);

  const star = page.locator(".popover [data-context-menu-item-id='star']");
  const openHiddenActions = async () => {
    await more.click();
    await page
      .locator(".popover [data-context-menu-item-id='record-actions']")
      .click();
    await expect(star).toBeVisible();
  };
  await openHiddenActions();
  await expect(star).toContainText("Star this resource");
  await star.click();
  await openHiddenActions();
  await expect(star).toContainText("Unstar");
  await more.click();
  await expect(page.locator(".popover button.contextmenuitem")).toHaveCount(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(more).toHaveCount(0);
  await expect(actions).toBeVisible();
  await expect(
    page.getByTestId("resource-context-tabs").getByRole("tab", {
      name: "Analytics",
      exact: true
    })
  ).toHaveAttribute("aria-selected", "true");
  await expect(title).toHaveText(objective.label);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await openResourceRecord(page, testInfo.project.name, "objective", objective);
  await expect(title).toHaveText(objective.label);
  await actions.click();
  await expect(star).toContainText("Unstar");
});
