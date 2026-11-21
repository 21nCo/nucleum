import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
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

test("navigator finds notes and tasks, opens a keyboard selection, and opens the other result beside it", async ({
  page,
  seed
}) => {
  test.setTimeout(120_000);
  await blockExternalAuthRequests(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ensureInAppOnHome(page);
  const term = `nav${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const noteBody = "A note opened from a cross-type navigator search";
  const note = await seed.memory.node({
    label: `${term} note`,
    content: noteBody
  });
  const task = await seed.focus.task({ label: `${term} task` });

  await page.getByTestId("navigator-pill").click();
  const input = page.getByTestId("navigator-search-input");
  await expect(input).toBeVisible();
  await input.fill(term);
  const results = page.getByTestId("navigator-search-result");
  await expect(results.filter({ hasText: note.label })).toBeVisible();
  await expect(results.filter({ hasText: task.label })).toBeVisible();
  await selectResultWithArrows(page, task.label);
  await input.press("Enter");

  const pagePane = page.locator("[data-context-zone-pane='page']");
  const taskName = pagePane.getByTestId("task-name-input");
  await expect(taskName).toBeVisible();
  await expect(taskName).toHaveValue(task.label);
  await expect(page.locator("[data-context-zone-pane='besidePage']")).toHaveCount(0);

  await expect(input).toBeVisible();
  await input.fill("");
  await expect(results).toHaveCount(0);
  await input.fill(term);
  await expect(results.filter({ hasText: note.label })).toBeVisible();
  await expect(results.filter({ hasText: task.label })).toBeVisible();
  await selectResultWithArrows(page, note.label);
  await input.press("ControlOrMeta+Enter");

  const besidePane = page.locator("[data-context-zone-pane='besidePage']");
  await expect(besidePane.locator("#mdContent")).toBeVisible();
  await expect(besidePane.locator("#mdContent")).toContainText(noteBody);
  await expect(taskName).toBeVisible();
  await expect(taskName).toHaveValue(task.label);
  await besidePane.getByText(noteBody, { exact: true }).click();
  await expect(
    page.getByTestId("top-bar-context-zone").getByTestId("top-bar-page-title")
  ).toHaveText(note.label);
});
