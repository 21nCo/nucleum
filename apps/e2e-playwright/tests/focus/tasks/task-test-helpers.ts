import { expect, type Page } from "@playwright/test";
import { expectAnyLocatorVisible } from "../../utils/locator-assertions";
import { openResourceRecord } from "../../utils/resource-matrix";

/** Opens a task record through the product resource contract. */
export async function openTaskRecord(
  page: Page,
  projectName: string,
  taskId: string
) {
  await openResourceRecord(page, projectName, "task", { id: taskId });
  await expect(page.getByTestId("task-name-input")).toBeVisible({
    timeout: 15_000
  });
}

/** Waits for a product-supported task record surface to become visible. */
export async function expectTaskRecordVisible(
  page: Page,
  options: { label?: string; timeout?: number } = {}
) {
  const anchors = [
    page.getByTestId("task-name-input").first(),
    page.getByRole("textbox", { name: /Task name/i }).first(),
    page.getByRole("button", { name: /Close/i }).first(),
    page.getByRole("button", { name: /Maximize|Minimize/i }).first(),
    page.locator("[data-panel-type], .border-t.border-x.border-brs3").first()
  ];
  if (options.label) {
    anchors.push(
      page.getByRole("heading", { name: options.label, exact: true }).first()
    );
  }
  await expectAnyLocatorVisible(anchors, {
    message: "task record exposes a visible semantic anchor",
    timeout: options.timeout ?? 25_000
  });
}
