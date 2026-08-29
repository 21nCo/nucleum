import { test } from "@playwright/test";
import { ensureInAppOnHome } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  expectNodeVisibleInLibrary,
  expectSavedNodeRecordVisible,
  fillCapture,
  openCapture,
  saveCapture
} from "./memory-test-helpers";

test.describe("memory - capture @creation @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("open Capture via command bar (Capture), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const captureText = `E2E capture ${Date.now()}`;
    await openCapture(page, "command");
    await fillCapture(page, captureText);
    await saveCapture(page, { close: false });
    await expectSavedNodeRecordVisible(page, captureText);
    await closeNodeRecord(page);
    await expectNodeVisibleInLibrary(page, captureText);
  });

  test("open Capture via UI (click Capture in top bar), type content, then Save", async ({
    page
  }) => {
    test.setTimeout(60_000);
    await ensureInAppOnHome(page);

    const captureText = `E2E capture UI ${Date.now()}`;
    await openCapture(page, "ui");
    await fillCapture(page, captureText);
    await saveCapture(page, { close: false });
    await expectSavedNodeRecordVisible(page, captureText);
    await closeNodeRecord(page);
    await expectNodeVisibleInLibrary(page, captureText);
  });
});
