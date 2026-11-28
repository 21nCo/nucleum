import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import { getResourceThumbnails } from "../utils/resource-matrix";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  expectSavedNodeRecordVisible,
  openCapture,
  openNodeRecordFromLibrary,
  openNodesLibrary,
  saveCapture
} from "./memory-test-helpers";

function captureBody(page: Page) {
  return page
    .getByTestId("capture-editor")
    .getByRole("textbox")
    .and(page.locator('[contenteditable]:not([contenteditable="false"])'))
    .first();
}

async function dismissCapture(page: Page) {
  await page.getByRole("button", { name: /^Capture$/ }).click();
  await expect(page.getByTestId("capture-editor")).toBeHidden();
}

test.describe("memory - Capture drafts @creation", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      isCloudAuthModeActive(),
      "Draft recovery uses a fresh offline workspace"
    );
    await blockExternalAuthRequests(page);
    await ensureInAppOnHome(page);
  });

  test("restore an unfinished Capture, continue editing, and save exactly once", async ({
    page
  }) => {
    test.setTimeout(120_000);
    const suffix = randomUUID().slice(0, 6);
    const title = `Alpine field journal ${suffix}`;
    const body = `Glacier observations before the afternoon survey ${suffix}.`;
    const finalBody = `${body} Evening measurements complete the record.`;
    const drafts = page.getByRole("button", {
      name: /^\d+ drafts? available$/
    });

    await openCapture(page, "ui");
    await expect(drafts).toHaveCount(0);
    await page.locator("#capture-title").fill(title);
    await page.locator("#capture-title").press("End");
    await captureBody(page).fill(body);
    await expect(page.locator("#capture-title")).toHaveText(title);
    await expect(captureBody(page)).toHaveText(body);
    await expect
      .poll(
        async () => {
          return page.evaluate(
            async ({ modulePath, title, body }) => {
              const { datafn } = await import(modulePath);
              const result = await datafn.capture.query({});
              return result.data?.some(
                (draft: { label?: string; body?: unknown }) =>
                  draft.label === title &&
                  JSON.stringify(draft.body).includes(body)
              );
            },
            {
              modulePath: resolveRepoFsImportPath(
                "client/datafn/datafn.store.ts"
              ),
              title,
              body
            }
          );
        },
        {
          message:
            "Capture autosave persists both the title and body before dismissal"
        }
      )
      .toBe(true);
    await dismissCapture(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await openCapture(page, "ui");
    await expect(drafts).toHaveText("1 draft available");
    await drafts.click();
    const draft = page.getByRole("button").filter({ hasText: title });
    await expect(draft).toHaveCount(1);
    await draft.click();
    await expect(page.locator("#capture-title")).toHaveText(title);
    await expect(captureBody(page)).toHaveText(body);
    await captureBody(page).fill(finalBody);
    await expect(captureBody(page)).toHaveText(finalBody);
    await saveCapture(page, { close: false });
    await expectSavedNodeRecordVisible(page, title);
    await expect(page.getByLabel("Markdown editor").first()).toHaveText(
      finalBody
    );
    await closeNodeRecord(page);
    await openNodesLibrary(page);
    await expect(getResourceThumbnails(page)).toHaveCount(1);
    await expect(getResourceThumbnails(page)).toContainText(title);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodesLibrary(page);
    await expect(getResourceThumbnails(page)).toHaveCount(1);
    await expect(getResourceThumbnails(page)).toContainText(title);
    await openNodeRecordFromLibrary(page, title);
    await expect(page.getByPlaceholder("Node title").first()).toHaveText(title);
    await expect(page.getByLabel("Markdown editor").first()).toHaveText(
      finalBody
    );
    await closeNodeRecord(page);
    await openCapture(page, "ui");
    await expect(captureBody(page)).toBeEmpty();
    test.fail(
      true,
      "Completing a restored Capture leaves an extra Untitled draft in the selector"
    );
    await expect(drafts).toHaveCount(0);
  });

  test("closing an empty Capture leaves no draft after reload", async ({
    page
  }) => {
    await openCapture(page, "ui");
    await expect(captureBody(page)).toBeEmpty();
    await expect(
      page.getByRole("button", { name: /^\d+ drafts? available$/ })
    ).toHaveCount(0);
    await dismissCapture(page);
    await page.reload();
    await ensureInAppOnHome(page);
    await openCapture(page, "ui");
    await expect(captureBody(page)).toBeEmpty();
    await expect(
      page.getByRole("button", { name: /^\d+ drafts? available$/ })
    ).toHaveCount(0);
    await dismissCapture(page);
    await openNodesLibrary(page);
    await expect(getResourceThumbnails(page)).toHaveCount(0);
  });
});
