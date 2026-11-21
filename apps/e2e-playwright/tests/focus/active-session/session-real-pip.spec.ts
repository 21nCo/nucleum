import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
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
  configureSessionComposition,
  dismissFinishedSession,
  readPersistedSession,
  reopenPersistedSession,
  setAutoPipPreference,
  setBackgroundSound,
  setEditMode
} from "./session-test-support";

async function openRealPip(page: Page) {
  const fullscreen = page.locator(
    '[data-testid="overlay-layer"][data-overlay="FULL_SCREEN_FOCUS"]'
  );
  const control = fullscreen.getByRole("button").filter({
    has: page.locator('use[href*="picture-in-picture"]')
  });
  await control.hover();
  await expect(
    page.getByText("Picture in picture", { exact: true })
  ).toBeVisible();
  const playerCountBeforeClick = await page.getByTestId("focus-player").count();
  await page.evaluate(() => {
    (window as any).__e2eRealPipRequestReceived = false;
    window.addEventListener(
      "pointron:focus-player:pip-request",
      () => {
        (window as any).__e2eRealPipRequestReceived = true;
      },
      { once: true }
    );
  });
  const opened = page
    .context()
    .waitForEvent("page", { timeout: 10_000 })
    .catch(() => null);
  await control.click();
  const pip = await opened;
  let diagnostics;
  if (!pip) {
    diagnostics = {
      playerCountBeforeClick,
      ...(await page.evaluate(() => ({
        requestReceived: (window as any).__e2eRealPipRequestReceived,
        nativeApiAvailable:
          typeof (window as any).documentPictureInPicture?.requestWindow ===
          "function",
        nativeWindowOpen: Boolean(
          (window as any).documentPictureInPicture?.window
        ),
        playerCountAfterClick:
          document.querySelectorAll('[data-testid="focus-player"]').length
      })))
    };
    await test.info().attach("real-pip-open-diagnostics", {
      contentType: "application/json",
      body: JSON.stringify(diagnostics)
    });
  }
  test.fail(
    !pip,
    "Clicking fullscreen Picture in picture does not open a native PiP window."
  );
  expect(
    pip,
    `the user click opens a real Document PiP window: ${JSON.stringify(diagnostics)}`
  ).not.toBeNull();
  if (!pip) throw new Error("No real Document PiP window opened");
  await expect(pip.getByTestId("focus-player")).toBeVisible();
  await expect(page.getByTestId("focus-player")).toHaveCount(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const api = (window as any).documentPictureInPicture;
          return Boolean(
            api?.window &&
            !api.window.closed &&
            api.window.document !== document
          );
        }),
      { message: "the player is hosted by a real separate Document PiP window" }
    )
    .toBe(true);
  return pip;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await ensureInAppOnHome(page);
  await resetFocusSession(page);
  await setEditMode(page, false);
  await setAutoPipPreference(page, false);
  await setBackgroundSound(page);
});

test.afterEach(async ({ page, context }) => {
  for (const popup of context.pages()) {
    if (popup !== page) await popup.close();
  }
  await setAutoPipPreference(page, false).catch(() => null);
  await resetFocusSession(page).catch(() => null);
});

async function startPipFocusSession(page: Page, seed: E2ESeed) {
  const objective = await seed.focus.objective({ prefix: "E2E real PiP" });
  await addAdvancedFocusItems(page, [objective.label]);
  await configureSessionComposition(page, {
    type: "Countup",
    totalDuration: 0,
    focusDuration: 0,
    breakDuration: 0,
    numberOfBreaks: 0,
    breakReminder: 0,
    breakType: "Reminder"
  });
  await startAdvancedFocus(page);
  await waitForSessionElapsed(page, 1);
  return {
    objective,
    sessionId: (await readSessionRuntime(page)).currentSessionId!
  };
}

test("real Document PiP supports break resume close restoration and persisted finish", async ({
  page,
  seed
}) => {
  const pageErrors = collectPageErrors(page);
  const { objective, sessionId } = await startPipFocusSession(page, seed);
  await exercisePipLifecycle(page, objective, sessionId, () => openRealPip(page));
  expect(pageErrors).toEqual([]);
});

test("mounted mini-player supports a real PiP lifecycle through fullscreen controls", async ({
  page,
  seed
}) => {
  const pageErrors = collectPageErrors(page);
  const { objective, sessionId } = await startPipFocusSession(page, seed);
  await page.getByRole("button", { name: /^Break$/ }).click();
  await expect(page.getByText("CURRENT BREAK", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "the main-window Break control updates the active session"
    })
    .toBe(3);
  await page.getByRole("button", { name: /^Resume$/ }).click();
  await expect(page.getByRole("button", { name: /^Break$/ })).toBeVisible();
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "the main-window Resume control updates the active session"
    })
    .toBe(1);
  await page.setViewportSize({ width: 800, height: 600 });
  await hideFocusFullscreen(page);
  const player = page.locator("#playercontainer").getByTestId("focus-player");
  await expect(player.getByText(objective.label, { exact: true })).toBeVisible();

  await exercisePipLifecycle(page, objective, sessionId, async () => {
    await player.getByText(objective.label, { exact: true }).click();
    const fullscreen = page.locator(
      '[data-testid="overlay-layer"][data-overlay="FULL_SCREEN_FOCUS"]'
    );
    const control = fullscreen.getByRole("button").filter({
      has: page.locator('use[href*="picture-in-picture"]')
    });
    await control.hover();
    await expect(
      page.getByText("Picture in picture", { exact: true })
    ).toBeVisible();
    const opened = page.context().waitForEvent("page", { timeout: 10_000 });
    await control.click();
    const pip = await opened;
    await expect(pip.getByTestId("focus-player")).toBeVisible();
    await expect(page.getByTestId("focus-player")).toHaveCount(0);
    expect(
      await page.evaluate(() => {
        const nativeWindow = (window as any).documentPictureInPicture.window;
        return Boolean(
          nativeWindow &&
            !nativeWindow.closed &&
            nativeWindow.document !== document
        );
      })
    ).toBe(true);
    await hideFocusFullscreen(page);
    return pip;
  });
  expect(pageErrors).toEqual([]);
});

async function exercisePipLifecycle(
  page: Page,
  objective: { id: string; label: string },
  sessionId: string,
  openPip: () => Promise<Page>
) {
  const pip = await openPip();
  const pipPlayer = pip.getByTestId("focus-player");
  await expect(
    pipPlayer.getByText(objective.label, { exact: true })
  ).toBeVisible();
  await pip.evaluate(() => {
    document.addEventListener(
      "click",
      (event) => {
        (window as any).__e2eNativePipClick = {
          isTrusted: event.isTrusted,
          breakControl: Boolean(
            (event.target as Element)
              .closest("button")
              ?.querySelector('use[href*="clock"]')
          )
        };
      },
      { capture: true, once: true }
    );
  });
  await pipPlayer
    .getByRole("button")
    .filter({
      has: pip.locator('use[href*="clock"]'),
      hasNot: pip.getByRole("button")
    })
    .click();
  try {
    await expect(
      pipPlayer.getByText("CURRENT BREAK", { exact: true })
    ).toBeVisible();
  } catch (error) {
    const runtime = await readSessionRuntime(page);
    const nativeClick = await pip.evaluate(
      () => (window as any).__e2eNativePipClick
    );
    await test.info().attach("real-pip-break-diagnostics", {
      contentType: "application/json",
      body: JSON.stringify({
        nativeClick,
        stateAfterClick: runtime.state,
        sameSession: runtime.currentSessionId === sessionId
      })
    });
    test.fail(
      runtime.state === 1 && nativeClick?.isTrusted && nativeClick?.breakControl,
      "A trusted Break click in native Document PiP does not reach the moved player's delegated Svelte handler."
    );
    throw new Error(`${String(error)}; native PiP click: ${JSON.stringify(nativeClick)}; session state: ${runtime.state}`);
  }
  await expect
    .poll(async () => (await readSessionRuntime(page)).state, {
      message: "break clicked in Document PiP updates the main session"
    })
    .toBe(3);
  await expect
    .poll(async () => (await readSessionRuntime(page)).timeElapsed, {
      message: "the real PiP break accrues time before resuming"
    })
    .toBeGreaterThanOrEqual(1);
  await pipPlayer
    .getByRole("button")
    .filter({
      has: pip.locator('use[href*="play-circle"]'),
      hasNot: pip.getByRole("button")
    })
    .click();
  await expect(
    pipPlayer.getByText(objective.label, { exact: true })
  ).toBeVisible();
  const resumed = await readSessionRuntime(page);
  expect(resumed.state).toBe(1);
  expect(resumed.currentSessionId).toBe(sessionId);
  expect(resumed.currentFocusItem?.id).toBe(objective.id);

  await pip.close();
  const restored = page.locator("#playercontainer").getByTestId("focus-player");
  await expect(restored).toHaveCount(1);
  await expect(restored).toBeAttached();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Boolean((window as any).documentPictureInPicture.window)
        ),
      { message: "closing PiP clears the native window reference" }
    )
    .toBe(false);
  await expect(
    page.getByText(objective.label, { exact: true }).first()
  ).toBeVisible();
  const afterClose = await readSessionRuntime(page);
  expect(afterClose.isSessionRunning).toBe(true);
  expect(afterClose.currentSessionId).toBe(sessionId);
  expect(afterClose.state).toBe(1);
  expect(afterClose.intervals).toHaveLength(resumed.intervals.length);

  const finishingPip = await openPip();
  const closed = finishingPip.waitForEvent("close");
  await finishingPip
    .getByTestId("focus-player")
    .getByRole("button")
    .filter({
      has: finishingPip.locator('use[href*="arrow-circle-right"]'),
      hasNot: finishingPip.getByRole("button")
    })
    .click();
  await expect(
    page.getByRole("button", { name: /^Done/i }).first()
  ).toBeVisible();
  await closed;
  await expect
    .poll(
      async () => (await readPersistedSession(page, sessionId)).session?.id,
      {
        message: "finishing from real PiP persists the same session"
      }
    )
    .toBe(sessionId);
  const persisted = await readPersistedSession(page, sessionId);
  expect(persisted.session?.items.map((item) => item.id)).toEqual([objective.id]);
  expect(
    persisted.logs.reduce((sum, log) => sum + log.focus, 0)
  ).toBeGreaterThan(0);
  expect(
    persisted.logs.reduce((sum, log) => sum + log.breakTime, 0)
  ).toBeGreaterThan(0);
  await dismissFinishedSession(page);
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(false);
  await reopenPersistedSession(page, sessionId, [objective.label]);
  expect(await readPersistedSession(page, sessionId)).toEqual(persisted);
  expect((await readSessionRuntime(page)).isSessionRunning).toBe(false);
}
