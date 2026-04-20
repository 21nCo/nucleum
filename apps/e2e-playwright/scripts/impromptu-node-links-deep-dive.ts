import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import {
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  type ProjectName
} from "./runtime";
import { openDeclaredNodeContentPanel } from "../tests/utils/settings-contracts";

import "dotenv/config";

interface StepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  sourceNodeTitle: string;
  targetNodeTitle: string;
  keyboardSourceNodeTitle: string;
  focusedSourceNodeTitle: string;
  noteText: string;
  steps: Record<string, StepResult>;
  browserConsole: Array<{ type: string; text: string; args?: unknown[] }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-node-links-deep-dive"
);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function captureStep(page: Page, artifactDir: string, name: string) {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: true
  });
  await fs.writeFile(
    path.join(artifactDir, `${name}.html`),
    await page.content(),
    "utf8"
  );
}

async function wait(page: Page, ms: number = 1000) {
  await page.waitForTimeout(ms);
}

async function createNodeViaCapture(page: Page, title: string) {
  const captureButton = page.getByRole("button", { name: /^Capture$/i }).first();
  await captureButton.click({ timeout: 10_000 });
  const titleEditor = page.locator("#capture-title").first();
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();
  await titleEditor.waitFor({ state: "visible", timeout: 15_000 });
  await contenteditable.waitFor({ state: "visible", timeout: 15_000 });
  await titleEditor.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await contenteditable.click({ timeout: 5_000 });
  await page.keyboard.type(title, { delay: 20 });
  await wait(page, 1200);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ timeout: 10_000 });
  await wait(page, 1500);

  const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => null);
    await wait(page, 800);
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
    await wait(page, 500);
  }
}

async function openNodesLibrary(page: Page, baseURL: string) {
  await page.goto(new URL("/library?resource=node&type=all", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await wait(page, 1200);
}

async function openNodeFromLibrary(page: Page, baseURL: string, title: string) {
  await openNodesLibrary(page, baseURL);
  const row = page.locator(".resource").filter({ hasText: title }).first();
  const fallback = page.getByText(title, { exact: false }).first();
  const target = (await row.isVisible().catch(() => false)) ? row : fallback;
  await target.waitFor({ state: "visible", timeout: 20_000 });
  await target.click({ timeout: 5_000 });
  await wait(page, 1800);
}

async function openNodePanel(page: Page, name: RegExp) {
  const tab = page.getByRole("tab", { name }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click({ timeout: 5_000 });
    await wait(page, 700);
    return;
  }
  const button = page.getByRole("button", { name }).first();
  await button.click({ timeout: 5_000 });
  await wait(page, 700);
}

async function focusNodeBody(
  page: Page,
  project: ProjectName,
  textToType: string
) {
  await openDeclaredNodeContentPanel(page, project);
  const editor = page
    .locator('[contenteditable="true"]')
    .filter({ hasNot: page.locator("#capture-title") })
    .first();
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click({ timeout: 5_000 });
  await page.keyboard.type(textToType, { delay: 20 });
  await wait(page, 1200);
}

async function typeIntoSidenotes(page: Page, noteText: string) {
  const notesInput = page.getByPlaceholder(/Add notes/i).first();
  await notesInput.waitFor({ state: "visible", timeout: 15_000 });
  await notesInput.click({ timeout: 5_000 });
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A"
  ).catch(() => null);
  await page.keyboard.type(noteText, { delay: 20 });
  await wait(page, 1600);
}

async function main() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const token = String(Date.now()).slice(-6);
  const sourceNodeTitle = `NodeLinksSource-${token}`;
  const targetNodeTitle = `NodeLinksTarget-${token}`;
  const keyboardSourceNodeTitle = `NodeLinksKey-${token}`;
  const focusedSourceNodeTitle = `NodeLinksFocus-${token}`;
  const noteText = `Side notes ${Date.now()}`;

  await fs.mkdir(artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    storageState: (await fs
      .access(getAuthPath(project))
      .then(() => getAuthPath(project))
      .catch(() => undefined)) as string | undefined
  });

  await context.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("offlineSessionId")) {
        const value =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem("offlineSessionId", value);
      }
    } catch {}
  });

  const page = await context.newPage();
  const browserConsole: ArtifactData["browserConsole"] = [];
  const pageErrors: string[] = [];
  const requestFailures: ArtifactData["requestFailures"] = [];
  const steps: ArtifactData["steps"] = {};

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await createNodeViaCapture(page, targetNodeTitle);
    await createNodeViaCapture(page, sourceNodeTitle);
    await createNodeViaCapture(page, keyboardSourceNodeTitle);
    await createNodeViaCapture(page, focusedSourceNodeTitle);

    try {
      await openNodeFromLibrary(page, baseURL, sourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const searchInput = page
        .getByPlaceholder(/Start searching to add a direct link/i)
        .first();
      await searchInput.waitFor({ state: "visible", timeout: 15_000 });
      await searchInput.fill(targetNodeTitle);
      await wait(page, 1500);

      const resultItem = page.getByText(targetNodeTitle, { exact: false }).first();
      await resultItem.waitFor({ state: "visible", timeout: 15_000 });
      await resultItem.click({ timeout: 5_000 });
      await wait(page, 1500);
      await captureStep(page, artifactDir, "01-linked-node");

      const linkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const linkedVisible = await linkedItem.isVisible().catch(() => false);

      steps.linkFromNodePanel = {
        success:
          linkedVisible &&
          !pageErrors.some((message) =>
            message.includes("effect_update_depth_exceeded")
          ),
        details: {
          linkedVisible,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        },
        error: linkedVisible ? undefined : "Linked node did not appear in links panel"
      };
      if (!steps.linkFromNodePanel.success) {
        throw new Error(steps.linkFromNodePanel.error ?? "Node linking failed");
      }
    } catch (error) {
      steps.linkFromNodePanel = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, sourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const reopenedLinkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const reopenedVisible = await reopenedLinkedItem.isVisible().catch(() => false);
      await captureStep(page, artifactDir, "02-reopened-links");
      steps.reopenNodeLinks = {
        success: reopenedVisible,
        details: {
          reopenedVisible,
          pageErrors: [...pageErrors],
          url: page.url()
        },
        error: reopenedVisible
          ? undefined
          : "Linked node did not persist after reopening source node"
      };
      if (!steps.reopenNodeLinks.success) {
        throw new Error(steps.reopenNodeLinks.error ?? "Reopened node links failed");
      }
    } catch (error) {
      steps.reopenNodeLinks = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, keyboardSourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const keyboardSearchInput = page
        .getByPlaceholder(/Start searching to add a direct link/i)
        .first();
      await keyboardSearchInput.waitFor({ state: "visible", timeout: 15_000 });
      await keyboardSearchInput.fill(targetNodeTitle);
      await wait(page, 1200);
      await keyboardSearchInput.press("ArrowDown").catch(() => null);
      await wait(page, 300);
      await keyboardSearchInput.press("Enter");
      await wait(page, 1500);
      await captureStep(page, artifactDir, "03-keyboard-linked-node");

      const keyboardLinkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const keyboardLinkedVisible = await keyboardLinkedItem
        .isVisible()
        .catch(() => false);
      steps.linkFromNodePanelKeyboard = {
        success:
          keyboardLinkedVisible &&
          !pageErrors.some((message) =>
            message.includes("effect_update_depth_exceeded")
          ),
        details: {
          keyboardLinkedVisible,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        },
        error: keyboardLinkedVisible
          ? undefined
          : "Keyboard-driven linking did not add the node to the links panel"
      };
      if (!steps.linkFromNodePanelKeyboard.success) {
        throw new Error(
          steps.linkFromNodePanelKeyboard.error ?? "Keyboard node linking failed"
        );
      }
    } catch (error) {
      steps.linkFromNodePanelKeyboard = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, keyboardSourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const reopenedKeyboardLinkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const reopenedKeyboardVisible = await reopenedKeyboardLinkedItem
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "04-reopened-keyboard-links");
      steps.reopenKeyboardLinkedNode = {
        success: reopenedKeyboardVisible,
        details: {
          reopenedKeyboardVisible,
          pageErrors: [...pageErrors],
          url: page.url()
        },
        error: reopenedKeyboardVisible
          ? undefined
          : "Keyboard-linked node did not persist after reopening source node"
      };
      if (!steps.reopenKeyboardLinkedNode.success) {
        throw new Error(
          steps.reopenKeyboardLinkedNode.error ??
            "Reopened keyboard-linked node failed"
        );
      }
    } catch (error) {
      steps.reopenKeyboardLinkedNode = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, focusedSourceNodeTitle);
      await focusNodeBody(page, project, `Focused block ${token}`);
      await openNodePanel(page, /^Links$/i);
      const focusedSearchInput = page
        .getByPlaceholder(/Start searching to add a direct link/i)
        .first();
      await focusedSearchInput.waitFor({ state: "visible", timeout: 15_000 });
      await focusedSearchInput.fill(targetNodeTitle);
      await wait(page, 1500);

      const focusedResultItem = page
        .getByText(targetNodeTitle, { exact: false })
        .first();
      await focusedResultItem.waitFor({ state: "visible", timeout: 15_000 });
      await focusedResultItem.click({ timeout: 5_000 });
      await wait(page, 1500);
      await captureStep(page, artifactDir, "05-focused-block-linked-node");

      const focusedLinkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const focusedLinkedVisible = await focusedLinkedItem
        .isVisible()
        .catch(() => false);
      steps.linkFromFocusedBlock = {
        success: focusedLinkedVisible,
        details: {
          focusedLinkedVisible,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-40),
          url: page.url()
        },
        error: focusedLinkedVisible
          ? undefined
          : "Focused-block linking did not add the node to the links panel"
      };
      if (!steps.linkFromFocusedBlock.success) {
        throw new Error(
          steps.linkFromFocusedBlock.error ?? "Focused-block node linking failed"
        );
      }
    } catch (error) {
      steps.linkFromFocusedBlock = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-40),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, focusedSourceNodeTitle);
      await openNodePanel(page, /^Links$/i);
      const reopenedFocusedLinkedItem = page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeTitle })
        .first();
      const reopenedFocusedVisible = await reopenedFocusedLinkedItem
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "06-reopened-focused-block-links");
      steps.reopenFocusedBlockLinkedNode = {
        success: reopenedFocusedVisible,
        details: {
          reopenedFocusedVisible,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-40),
          url: page.url()
        },
        error: reopenedFocusedVisible
          ? undefined
          : "Focused-block-linked node did not persist after reopening source node"
      };
      if (!steps.reopenFocusedBlockLinkedNode.success) {
        throw new Error(
          steps.reopenFocusedBlockLinkedNode.error ??
            "Reopened focused-block-linked node failed"
        );
      }
    } catch (error) {
      steps.reopenFocusedBlockLinkedNode = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-40),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, sourceNodeTitle);
      await openNodePanel(page, /^Side notes$/i);
      await typeIntoSidenotes(page, noteText);
      await captureStep(page, artifactDir, "07-sidenotes");
      const hasPropsInvalidValue = pageErrors.some((message) =>
        message.includes("props_invalid_value")
      );
      steps.openSidenotes = {
        success: !hasPropsInvalidValue,
        details: {
          hasPropsInvalidValue,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        },
        error: hasPropsInvalidValue
          ? "Opening sidenotes triggered props_invalid_value"
          : undefined
      };
      if (!steps.openSidenotes.success) {
        throw new Error(steps.openSidenotes.error ?? "Sidenotes failed");
      }
    } catch (error) {
      steps.openSidenotes = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }

    try {
      await openNodeFromLibrary(page, baseURL, sourceNodeTitle);
      await openNodePanel(page, /^Side notes$/i);
      const reopenedNotesInput = page.getByPlaceholder(/Add notes/i).first();
      await reopenedNotesInput.waitFor({ state: "visible", timeout: 15_000 });
      const reopenedNoteValue =
        (await reopenedNotesInput.inputValue().catch(() => "")) ||
        (await reopenedNotesInput.textContent().catch(() => "")) ||
        "";
      await captureStep(page, artifactDir, "08-reopened-sidenotes");
      steps.reopenSidenotes = {
        success: reopenedNoteValue.includes(noteText),
        details: {
          reopenedNoteValue,
          noteText,
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        },
        error: reopenedNoteValue.includes(noteText)
          ? undefined
          : "Sidenotes content did not persist after reopening node"
      };
      if (!steps.reopenSidenotes.success) {
        throw new Error(steps.reopenSidenotes.error ?? "Sidenotes reopen failed");
      }
    } catch (error) {
      steps.reopenSidenotes = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          pageErrors: [...pageErrors],
          browserConsoleTail: browserConsole.slice(-20),
          url: page.url()
        }
      };
      throw error;
    }
  } finally {
    const appLogs = await flushAppLogs(page);
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      sourceNodeTitle,
      targetNodeTitle,
      keyboardSourceNodeTitle,
      focusedSourceNodeTitle,
      noteText,
      steps,
      browserConsole,
      pageErrors,
      requestFailures,
      appLogs
    };
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifact, null, 2),
      "utf8"
    );
    await browser.close();
  }
}

void main();
