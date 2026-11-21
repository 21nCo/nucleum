import { expect, test } from "@playwright/test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { openSettings } from "../../utils/settings";

for (const viewport of [
  { width: 320, height: 844 },
  { width: 375, height: 844 },
  { width: 390, height: 844 },
  { width: 430, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 1000 }
]) {
  test(`Data Settings fits its scrolling container at ${viewport.width}x${viewport.height} @settings @regression${viewport.width === 390 ? " @smoke" : ""}`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ensureInAppOnHome(page);
    await page.setViewportSize(viewport);
    if (viewport.width < 990) {
      await page.getByTestId("phone-home-settings").click();
    } else {
      await openSettings(page);
    }
    await page
      .getByRole("button", { name: "Data Settings", exact: true })
      .click();

    const backup = page.getByRole("button", { name: "Backup", exact: true });
    await expect(backup).toBeVisible();
    const content = page.locator("main").filter({ has: backup });
    await expect(
      content.getByText("Backup and restore", { exact: true })
    ).toBeVisible();
    await expect(
      content.getByText("End-to-end encryption", { exact: true })
    ).toBeVisible();
    await expect(
      content.getByText("Import and export", { exact: true })
    ).toBeVisible();
    await expect(
      content.getByText(/Note: At the moment, Restore only works/)
    ).toBeVisible();

    const overflow = await content.evaluate((root) => {
      const failures: string[] = [];
      const check = (
        element: Element,
        left: number,
        right: number,
        label: string
      ) => {
        for (
          let ancestor = element.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (!/auto|scroll|hidden|clip/.test(style.overflowX)) continue;
          const bounds = ancestor.getBoundingClientRect();
          if (left < bounds.left - 1 || right > bounds.right + 1) {
            failures.push(
              `${label}: ${left}..${right} outside ${bounds.left}..${bounds.right}`
            );
          }
        }
      };
      for (const element of root.querySelectorAll("section, button")) {
        const bounds = element.getBoundingClientRect();
        check(element, bounds.left, bounds.right, element.textContent ?? "");
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim() || !node.parentElement) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const bounds of range.getClientRects()) {
          check(
            node.parentElement,
            bounds.left,
            bounds.right,
            node.textContent
          );
        }
      }
      return failures;
    });
    expect(
      overflow,
      "sections, controls and every text line fit all clipping ancestors"
    ).toEqual([]);

    const buttons = content.getByRole("button");
    expect(await buttons.count()).toBeGreaterThanOrEqual(6);
    for (const button of await buttons.all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
    }
    const resync = await content
      .getByRole("button", { name: "Resync data", exact: true })
      .boundingBox();
    const clear = await content
      .getByRole("button", { name: "Clear local cache", exact: true })
      .boundingBox();
    expect(resync).not.toBeNull();
    expect(clear).not.toBeNull();
    if (viewport.width <= 430) {
      expect(clear!.y).toBeGreaterThan(resync!.y);
    } else if (viewport.width === 1440) {
      expect(clear!.y).toBe(resync!.y);
    }
  });
}
