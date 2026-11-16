import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import { resolveRepoFsImportPath } from "../../utils/repo-fs";
import {
  addAdvancedFocusItems,
  readSessionRuntime,
  resetFocusSession,
  startAdvancedFocus,
  waitForSessionElapsed
} from "../focus-test-helpers";
import {
  finishSessionFromControl,
  readPersistedSession,
  setEditMode
} from "./session-test-support";

const sessionStorePath = resolveRepoFsImportPath(
  "client/features/focus/session.store.ts"
);
const finishedSessionState = 7;

let e2eSeed: E2ESeed;

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
  await setEditMode(page, false);
});

test.afterEach(async ({ page }) => {
  await setEditMode(page, false).catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

async function readSessionLoaderInitialized(page: Page) {
  return page.evaluate(
    async ({ modulePath }) => {
      const sessionMod = await import(modulePath);
      return Boolean(sessionMod.activeSession.isInitialized);
    },
    { modulePath: sessionStorePath }
  );
}

test("keeps the session finished modal closed when reloading right after Done", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E finished modal reload"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId;
  expect(sessionId, "the running focus session has an id").toBeTruthy();

  await finishSessionFromControl(page);
  const finishedModal = page.locator("#SESSION_FINISHED");
  await expect(finishedModal).toBeVisible();
  await finishedModal
    .getByRole("button", { name: /^Done/i })
    .click({ timeout: 10_000 });
  await expect(finishedModal).toBeHidden({ timeout: 15_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await expect
    .poll(async () => readSessionLoaderInitialized(page), {
      message:
        "session finished modal reload: the active session snapshot is loaded after reload",
      timeout: 15_000
    })
    .toBe(true);
  const reloaded = await readSessionRuntime(page);
  expect(reloaded.state).not.toBe(finishedSessionState);
  expect(reloaded.currentSessionId).toBeUndefined();
  await expect(finishedModal).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Focus$/i }).first()
  ).toBeVisible({ timeout: 15_000 });
  expect((await readPersistedSession(page, sessionId!)).session?.id).toBe(
    sessionId
  );
});
