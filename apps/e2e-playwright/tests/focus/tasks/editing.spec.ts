import { expect, test } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { getResourceRecordSurface } from "../../utils/resource-matrix";
import { resolveRepoFsImportPath } from "../../utils/repo-fs";
import { blockGoogleAccountsNavigation } from "../focus-test-helpers";
import { openTaskRecord } from "./task-test-helpers";

const datafnStorePath = resolveRepoFsImportPath(
  "client/datafn/datafn.store.ts"
);

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await blockGoogleAccountsNavigation(page);
  await ensureInAppOnHome(page);
});

test("task name and due date edits persist after reload @record-page", async ({
  page,
  seed
}, testInfo) => {
  const task = await seed.focus.task({ prefix: "E2E edit task" });
  await openTaskRecord(page, testInfo.project.name, task.id);
  const record = getResourceRecordSurface(page);
  const name = record.getByTestId("task-name-input");
  const renamed = `${task.label} renamed`;
  await name.fill(renamed);
  await name.press("Tab");
  await expect(name).toHaveValue(renamed);
  await expect(
    record.getByText("Task name updated", { exact: true })
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(name).toHaveValue(renamed);

  const dueDate = record
    .getByText("Due date", { exact: true })
    .locator("..")
    .locator("..")
    .getByRole("button");
  await expect(dueDate).toHaveText("Set due date");
  await dueDate.click();
  const calendar = page.locator("#date-picker-popover");
  await calendar.getByRole("spinbutton").fill("2030");
  await calendar.getByRole("spinbutton").press("Tab");
  await calendar.getByRole("button", { name: "Jan", exact: true }).click();
  await calendar.getByRole("button", { name: "15", exact: true }).click();
  await expect(calendar).toBeHidden();
  await expect(dueDate).toHaveText("Jan 15, 2030");
  await expect(
    record.getByText("Due date updated", { exact: true })
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(name).toHaveValue(renamed);
  await expect(dueDate).toHaveText("Jan 15, 2030");
});

test("assigning changing and clearing a task objective persist after reload @record-page", async ({
  page,
  seed
}, testInfo) => {
  const task = await seed.focus.task({ prefix: "E2E task objective" });
  const objectives = await seed.focus.objectives(2, {
    prefix: "E2E task assignment"
  });
  await openTaskRecord(page, testInfo.project.name, task.id);
  const record = getResourceRecordSurface(page);
  const search = record.getByPlaceholder("Search to assign an objective");

  for (const objective of objectives) {
    await search.fill(objective.label);
    await page
      .locator(".popover")
      .getByText(objective.label, { exact: true })
      .click();
    const assigned = record.getByRole("button", {
      name: objective.label,
      exact: true
    });
    await expect(assigned).toBeVisible();
    await expect(search).toBeHidden();
    await expect(
      record.getByText("Objective updated", { exact: true })
    ).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(assigned).toBeVisible();
    await expect(search).toBeHidden();

    await assigned.locator("..").getByRole("button").last().click();
    await expect(search).toBeVisible();
    await expect(assigned).toBeHidden();
    await expect(
      record.getByText("Objective cleared", { exact: true })
    ).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(search).toBeVisible();
    await expect(assigned).toBeHidden();
  }
});

test("completing and reopening a task shows and clears its completed date after reload @record-page", async ({
  page,
  seed
}, testInfo) => {
  const task = await seed.focus.task({ prefix: "E2E task completion" });
  await openTaskRecord(page, testInfo.project.name, task.id);
  const record = getResourceRecordSurface(page);
  const checkbox = record.getByTestId(`task-checkbox:${task.id}`);
  const completedLabel = record.getByText("Completed date", { exact: true });
  const completedDate = completedLabel
    .locator("..")
    .locator("..")
    .getByRole("button");
  await expect(checkbox).toHaveAccessibleName("Mark task complete");
  await expect(completedLabel).toBeHidden();
  await checkbox.click();
  await expect(checkbox).toHaveAccessibleName("Mark task incomplete");
  await expect(completedLabel).toBeVisible();
  const completedText = await page.evaluate(() =>
    new Date().toLocaleDateString(navigator.language, {
      month: "short",
      day: "2-digit",
      year: "numeric"
    })
  );
  await expect(completedDate).toHaveText(completedText);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(checkbox).toHaveAccessibleName("Mark task incomplete");
  await expect(completedDate).toHaveText(completedText);

  await checkbox.click();
  await expect(checkbox).toHaveAccessibleName("Mark task complete");
  await expect(completedLabel).toBeHidden();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(checkbox).toHaveAccessibleName("Mark task complete");
  await expect(completedLabel).toBeHidden();
  await expect
    .poll(
      () =>
        page.evaluate(
          async ({ modulePath, taskId }) => {
            const { datafn } = await import(modulePath);
            const result = await datafn.task.query({ filters: { id: taskId } });
            const record = result.data?.[0];
            return record
              ? {
                  id: record.id.toString(),
                  completedAtUnix: record.completedAtUnix ?? null
                }
              : undefined;
          },
          { modulePath: datafnStorePath, taskId: task.id }
        ),
      { message: "reopening a task clears its persisted completed date" }
    )
    .toEqual({ id: task.id, completedAtUnix: null });
  await expect(completedLabel).toBeHidden();
});
