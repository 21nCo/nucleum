import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { expectAnyLocatorVisible } from "../../utils/locator-assertions";
import { blockGoogleAccountsNavigation } from "../focus-test-helpers";
import { expectTaskRecordVisible, openTaskRecord } from "./task-test-helpers";

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await blockGoogleAccountsNavigation(page);
});

test("open task record page and assert panels/expected content visible @record-page", async ({
  page
}) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);

  const taskName = `E2E task record ${Date.now()}`;
  const task = await e2eSeed.focus.task({ label: taskName });
  await openTaskRecord(page, test.info().project.name, task.id);

  await expectTaskRecordVisible(page);
  await expectTaskRecordContent(page, "Info", taskName);
});

async function expectTaskRecordContent(
  page: import("@playwright/test").Page,
  tabLabel: string,
  taskName: string
) {
  const lowerLabel = tabLabel.toLowerCase();
  if (lowerLabel.includes("info")) {
    const infoAnchors = [
      page.getByTestId("task-name-input"),
      page.getByRole("textbox", { name: /Task name/i }).first(),
      page.getByRole("heading", { name: new RegExp(`^${taskName}$`) }).first(),
      page.getByText(/Created:/i).first(),
      page.getByText(/Status/i).first(),
      page.getByText(taskName).first()
    ];
    await expectAnyLocatorVisible(infoAnchors, {
      message: "task info panel exposes a visible content anchor",
      timeout: 10_000
    });
    return;
  }
  if (lowerLabel.includes("activity")) {
    await expectAnyLocatorVisible(
      [
        page.getByText(/History|Activity|All/i).first(),
        page.getByText(/No data available/i).first()
      ],
      {
        message: "task activity panel exposes history or its empty state",
        timeout: 10_000
      }
    );
    return;
  }
  await expectTaskRecordVisible(page);
}
