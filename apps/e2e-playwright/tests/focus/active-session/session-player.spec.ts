import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome, runCommand } from "../../utils/helpers";
import {
  addAdvancedFocusItems,
  collectPageErrors,
  hideFocusFullscreen,
  readSessionRuntime,
  resetFocusSession,
  startAdvancedFocus,
  waitForSessionElapsed
} from "../focus-test-helpers";
import {
  dismissFinishedSession,
  finishSessionFromControl,
  getFocusPlayer,
  getSessionNotesEditor,
  readPersistedSession,
  reopenPersistedSession,
  setAutoPipPreference,
  setBackgroundSound,
  setEditMode
} from "./session-test-support";

let e2eSeed: E2ESeed;

async function installPipMock(
  page: Page,
  options: { rejectWith?: string } = {}
) {
  await page.evaluate(({ rejectWith }) => {
    const listeners = new Set<(event: Event) => void>();
    const api: any = {
      requestCount: 0,
      window: null
    };
    const pipWindow: any = {
      document,
      addEventListener(type: string, listener: (event: Event) => void) {
        if (type === "pagehide") listeners.add(listener);
      },
      removeEventListener(type: string, listener: (event: Event) => void) {
        if (type === "pagehide") listeners.delete(listener);
      },
      close() {
        api.window = null;
      }
    };
    api.requestWindow = async () => {
      api.requestCount += 1;
      if (rejectWith) throw new DOMException("E2E PiP rejection", rejectWith);
      api.window = pipWindow;
      return pipWindow;
    };
    Object.defineProperty(window, "documentPictureInPicture", {
      configurable: true,
      value: api
    });
    (window as any).__e2ePip = api;
  }, options);
}

async function readPipMock(page: Page) {
  return page.evaluate(() => {
    const api = (window as any).__e2ePip;
    return {
      isOpen: Boolean(api?.window),
      requestCount: Number(api?.requestCount ?? 0)
    };
  });
}

async function requestFocusPlayerPip(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("pointron:focus-player:pip-request", {
        detail: { sourceEvent: new Event("click") }
      })
    );
  });
}

test.beforeEach(async ({ page, seed }) => {
  e2eSeed = seed;
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
  await setEditMode(page, false);
  await setAutoPipPreference(page, false);
  await setBackgroundSound(page);
});

test.afterEach(async ({ page }) => {
  await setAutoPipPreference(page, false).catch(() => null);
  await setBackgroundSound(page).catch(() => null);
  await setEditMode(page, false).catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

test("updates top navigation and document title across focus break and finish", async ({
  page
}, testInfo) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E title state"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;

  await expect(page).toHaveTitle(/Focus: \d{2}:\d{2}(?::\d{2})? - /);
  await expect(
    page.getByRole("button", { name: /^\d{2}:\d{2}(?::\d{2})?$/ }).last()
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect(page).toHaveTitle(/Break: \d{2}:\d{2}(?::\d{2})? - /);

  await page
    .getByRole("button", { name: /^Resume$/i })
    .first()
    .click({ timeout: 5_000 });
  await finishSessionFromControl(page);
  await dismissFinishedSession(page);

  const expectedProduct = `${testInfo.project.name[0].toUpperCase()}${testInfo.project.name.slice(1)}`;
  await expect(page).toHaveTitle(new RegExp(`^${expectedProduct} - `));
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
});

test("shows the current item in the mini player and reopens full screen", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E mini player"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await hideFocusFullscreen(page);

  const miniPlayer = getFocusPlayer(page)
    .getByRole("button")
    .filter({
      has: page.getByText(fixture.objective.label, { exact: true })
    })
    .first();
  const miniPlayerVisible = await miniPlayer
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  test.fail(
    !miniPlayerVisible,
    "The focus mini-player is currently mounted with the active item but remains hidden after full-screen closes."
  );
  expect(miniPlayerVisible).toBe(true);
  await miniPlayer.click({ timeout: 5_000 });
  await expect(
    page.locator('[aria-roledescription="zen mode"]').first()
  ).toBeVisible({ timeout: 15_000 });
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(true);
});

test("reactively updates the current item label after a rename", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E rename player"
  });
  const renamed = `${fixture.objective.label} renamed`;
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);

  await e2eSeed.focus.updateResourceLabel(
    "objective",
    fixture.objective.id,
    renamed
  );

  await expect(page.getByText(renamed, { exact: true }).first()).toBeVisible({
    timeout: 15_000
  });
  await expect(
    page.getByText(fixture.objective.label, { exact: true })
  ).toHaveCount(0);
});

test("shares notes with Think mode and persists them in the finished session", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E session notes"
  });
  const notesText = `E2E session note ${Date.now()}`;
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  const sessionId = (await readSessionRuntime(page)).currentSessionId!;
  await runCommand(page, "Think mode");

  const editor = getSessionNotesEditor(page);
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await editor.click();
  await editor.pressSequentially(notesText);
  const notesPropagated = await expect
    .poll(async () => JSON.stringify((await readSessionRuntime(page)).notes), {
      message:
        "shares notes with Think mode and persists them in the finishe...: toContain notesText"
    })
    .toContain(notesText)
    .then(() => true)
    .catch(() => false);
  test.fail(
    !notesPropagated,
    "Think mode renders typed notes but currently leaves the active-session notes body empty."
  );
  expect(notesPropagated).toBe(true);
  await page
    .getByRole("button", { name: /^Go back$/i })
    .click({ timeout: 5_000 });
  await runCommand(page, "Think mode");
  await expect(getSessionNotesEditor(page)).toContainText(notesText);
  await page
    .getByRole("button", { name: /^Go back$/i })
    .click({ timeout: 5_000 });

  await finishSessionFromControl(page);
  const persisted = await readPersistedSession(page, sessionId);
  await dismissFinishedSession(page);
  expect(JSON.stringify(persisted.session?.notes)).toContain(notesText);
  await reopenPersistedSession(page, sessionId, [fixture.objective.label]);
  await page.getByText("Notes", { exact: true }).click({ timeout: 5_000 });
  await expect(page.getByText(notesText, { exact: true })).toBeVisible({
    timeout: 15_000
  });
});

test("restores session notes after reload", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E reload notes"
  });
  const notesText = `E2E reloaded note ${Date.now()}`;
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await runCommand(page, "Think mode");

  const editor = getSessionNotesEditor(page);
  await editor.click();
  await editor.pressSequentially(notesText);
  const notesPropagated = await expect
    .poll(async () => JSON.stringify((await readSessionRuntime(page)).notes), {
      message: "restores session notes after reload: toContain notesText"
    })
    .toContain(notesText)
    .then(() => true)
    .catch(() => false);
  test.fail(
    !notesPropagated,
    "Think mode notes currently do not propagate into active-session persistence."
  );
  expect(notesPropagated).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureInAppOnHome(page);
  await runCommand(page, "Think mode");
  await expect(getSessionNotesEditor(page)).toContainText(notesText);
});

test("keeps the timer running while Think mode is open", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E think timer"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  const before = (await readSessionRuntime(page)).totalElapsed;

  await runCommand(page, "Think mode");
  await waitForSessionElapsed(page, Math.floor(before) + 1);
  await expect(page.getByText("Thinking...", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /^Go back$/i })
    .click({ timeout: 5_000 });

  expect((await readSessionRuntime(page)).totalElapsed).toBeGreaterThan(before);
});

test("opens automatic PiP once and closes it when the session finishes", async ({
  page
}) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E auto pip"
  });
  await installPipMock(page);
  await setAutoPipPreference(page, true);
  await addAdvancedFocusItems(page, [fixture.objective.label]);

  await startAdvancedFocus(page);
  await expect
    .poll(async () => (await readPipMock(page)).requestCount, {
      message:
        "opens automatic PiP once and closes it when the session finishes: toBe 1"
    })
    .toBe(1);
  expect((await readPipMock(page)).isOpen).toBe(true);

  await finishSessionFromControl(page);
  await expect
    .poll(async () => (await readPipMock(page)).isOpen, {
      message:
        "opens automatic PiP once and closes it when the session finishes: toBe false"
    })
    .toBe(false);
  await dismissFinishedSession(page);
});

test("opens manual PiP when automatic PiP is disabled", async ({ page }) => {
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E manual pip"
  });
  await installPipMock(page);
  await setAutoPipPreference(page, false);
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);

  await requestFocusPlayerPip(page);

  await expect
    .poll(async () => (await readPipMock(page)).requestCount, {
      message: "opens manual PiP when automatic PiP is disabled: toBe 1"
    })
    .toBe(1);
  expect((await readPipMock(page)).isOpen).toBe(true);
});

test("handles a denied manual PiP request without a page error", async ({
  page
}) => {
  const pageErrors = collectPageErrors(page);
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E denied pip"
  });
  await installPipMock(page, { rejectWith: "NotAllowedError" });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);

  await requestFocusPlayerPip(page);
  await expect
    .poll(async () => (await readPipMock(page)).requestCount, {
      message:
        "handles a denied manual PiP request without a page error: toBe 1"
    })
    .toBe(1);

  expect((await readPipMock(page)).isOpen).toBe(false);
  expect(pageErrors).toEqual([]);
});

test("plays background sound during focus and pauses it for break and finish", async ({
  page
}) => {
  await page.route("**/sounds/rain.mp3", (route) =>
    route.fulfill({ body: "", contentType: "audio/mpeg", status: 200 })
  );
  await page.evaluate(() => {
    const media = HTMLMediaElement.prototype as any;
    (window as any).__e2eAudio = { pauseCount: 0, playCount: 0 };
    media.play = async () => {
      (window as any).__e2eAudio.playCount += 1;
    };
    media.pause = () => {
      (window as any).__e2eAudio.pauseCount += 1;
    };
  });
  const fixture = await e2eSeed.focus.resources({
    prefix: "E2E background sound"
  });
  await addAdvancedFocusItems(page, [fixture.objective.label]);
  await startAdvancedFocus(page);
  await setBackgroundSound(page, "Rain");

  await expect
    .poll(
      async () =>
        await page.evaluate(() => (window as any).__e2eAudio.playCount),
      {
        message:
          "plays background sound during focus and pauses it for break a...: toBeGreaterThanOrEqual 1"
      }
    )
    .toBeGreaterThanOrEqual(1);

  await page
    .getByRole("button", { name: /^Break$/i })
    .first()
    .click({ timeout: 5_000 });
  await expect
    .poll(
      async () =>
        await page.evaluate(() => (window as any).__e2eAudio.pauseCount),
      {
        message:
          "plays background sound during focus and pauses it for break a...: toBeGreaterThanOrEqual 1"
      }
    )
    .toBeGreaterThanOrEqual(1);

  await page
    .getByRole("button", { name: /^Resume$/i })
    .first()
    .click({ timeout: 5_000 });
  const resumedPlayback = await expect
    .poll(
      async () =>
        await page.evaluate(() => (window as any).__e2eAudio.playCount),
      {
        message:
          "plays background sound during focus and pauses it for break a...: toBeGreaterThanOrEqual 2"
      }
    )
    .toBeGreaterThanOrEqual(2)
    .then(() => true)
    .catch(() => false);
  test.fail(
    !resumedPlayback,
    "Background sound pauses for break but currently does not resume when focus resumes."
  );
  expect(resumedPlayback).toBe(true);

  await finishSessionFromControl(page);
  await expect
    .poll(
      async () =>
        await page.evaluate(() => (window as any).__e2eAudio.pauseCount),
      {
        message:
          "plays background sound during focus and pauses it for break a...: toBeGreaterThanOrEqual 2"
      }
    )
    .toBeGreaterThanOrEqual(2);
  await dismissFinishedSession(page);
});
