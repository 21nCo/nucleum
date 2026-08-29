import { expect, test, type Locator, type Page } from "@playwright/test";
import { LibraryTab, openLibraryAndTab, runCommand } from "../utils/helpers";
import { expectAnyLocatorVisible } from "../utils/locator-assertions";
import {
  getResourceRecordsContainer,
  getResourceThumbnail,
  getResourceThumbnailByLabel,
  requireResourceBrowseContract
} from "../utils/resource-matrix";

/** Supported entry points for opening the memory Capture surface. */
export type CaptureEntryPoint = "command" | "ui";

/** Options for creating a memory node through the shared Capture workflow. */
export interface CreateMemoryNodeOptions {
  content?: string;
  close?: boolean;
  entryPoint?: CaptureEntryPoint;
  expectSavedNotification?: boolean;
  label?: string;
  prefix?: string;
  title?: string;
}

function resolveNodeLabel(options: CreateMemoryNodeOptions) {
  return options.label ?? `${options.prefix ?? "E2E node"} ${Date.now()}`;
}

async function resolveCaptureEditor(page: Page): Promise<Locator> {
  const captureRoot = page.getByTestId("capture-editor");
  const placeholderEditor = captureRoot
    .getByPlaceholder(/Start typing/i)
    .first();
  if (await placeholderEditor.isVisible().catch(() => false)) {
    return placeholderEditor;
  }

  const contentEditable = captureRoot
    .locator('[contenteditable="true"]')
    .first();
  if (await contentEditable.isVisible().catch(() => false)) {
    return contentEditable;
  }

  const semanticEditor = captureRoot
    .getByRole("textbox", {
      name: /Markdown editor|Start typing/i
    })
    .first();
  if (await semanticEditor.isVisible().catch(() => false)) {
    return semanticEditor;
  }

  const markdownButton = page
    .getByRole("button", { name: /^Markdown$/i })
    .first();
  const markdownButtonVisible = await markdownButton
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (markdownButtonVisible) {
    await markdownButton.click({ timeout: 5_000 });
  }

  await expectAnyLocatorVisible(
    [placeholderEditor, semanticEditor, contentEditable],
    {
      message: "capture exposes an editable text surface",
      timeout: 10_000
    }
  );
  if (await placeholderEditor.isVisible().catch(() => false))
    return placeholderEditor;
  if (await semanticEditor.isVisible().catch(() => false))
    return semanticEditor;
  if (await contentEditable.isVisible().catch(() => false))
    return contentEditable;

  await captureRoot.waitFor({ state: "visible", timeout: 15_000 });
  return captureRoot;
}

/** Block external Google authentication requests during memory-domain tests. */
export async function blockExternalAuthRequests(page: Page) {
  await page.route("**/*", (route) => {
    if (/accounts\.google\.com/i.test(route.request().url())) {
      route.abort();
      return;
    }
    route.continue();
  });
}

/** Open Capture through the requested product entry point. */
export async function openCapture(
  page: Page,
  entryPoint: CaptureEntryPoint = "command"
) {
  if (entryPoint === "command") {
    await runCommand(page, "Capture");
  } else {
    await page
      .getByRole("button", { name: /^Capture$/i })
      .first()
      .click({ timeout: 5_000 });
  }
  await page.getByTestId("capture-editor").waitFor({
    state: "visible",
    timeout: 15_000
  });
}

/** Fill the active Capture editor with node content and an optional title. */
export async function fillCapture(page: Page, content: string, title?: string) {
  if (title) {
    const titleEditor = page.locator("#capture-title").first();
    await titleEditor.waitFor({ state: "visible", timeout: 15_000 });
    await titleEditor.click({ timeout: 5_000 });
    await page.keyboard.type(title, { delay: 20 });
  }

  const editor = await resolveCaptureEditor(page);
  const captureRoot = page.getByTestId("capture-editor");
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await editor.click({ timeout: 5_000 });
  await page.keyboard.type(content, { delay: 25 });
  await expect
    .poll(
      async () => {
        const value = await editor.inputValue().catch(() => undefined);
        const editorText = (await editor.textContent().catch(() => "")) ?? "";
        const captureText =
          (await captureRoot.innerText().catch(() => "")) ?? "";
        return [value ?? "", editorText, captureText].join(" ");
      },
      { message: "fillCapture: toContain content" }
    )
    .toContain(content);
}

/** Save the active Capture and optionally close the Capture surface. */
export async function saveCapture(
  page: Page,
  options: { close?: boolean; expectSavedNotification?: boolean } = {}
) {
  const saveButton = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveButton).toBeVisible({ timeout: 10_000 });
  await saveButton.click({ timeout: 10_000 });

  if (options.expectSavedNotification) {
    await expect(
      page.getByText(/Node saved|saved successfully/i).first()
    ).toBeVisible({ timeout: 20_000 });
  }

  if (!options.close) {
    await expect(saveButton).toBeHidden({ timeout: 20_000 });
    return;
  }

  const closeButton = page.getByRole("button", { name: /^Close$/i }).first();
  await expect(async () => {
    if (await closeButton.isVisible().catch(() => false)) {
      await expect(closeButton).toBeVisible({ timeout: 500 });
      return;
    }
    await expect(saveButton).toBeHidden({ timeout: 500 });
  }, "capture save completes or exposes the close action").toPass({
    timeout: 20_000
  });
  const closeButtonVisible = await closeButton
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (closeButtonVisible) {
    await closeButton.click({ timeout: 5_000 });
  } else {
    await page.keyboard.press("Escape").catch(() => null);
    await page.keyboard.press("Escape").catch(() => null);
  }
  await expect(page.getByTestId("capture-editor")).toBeHidden({
    timeout: 10_000
  });
}

/** Create a memory node through Capture and return its identifying label. */
export async function createNodeViaCapture(
  page: Page,
  options: CreateMemoryNodeOptions | string = {}
) {
  const resolvedOptions =
    typeof options === "string" ? { label: options } : options;
  const label = resolveNodeLabel(resolvedOptions);
  await openCapture(page, resolvedOptions.entryPoint);
  await fillCapture(
    page,
    resolvedOptions.content ?? label,
    resolvedOptions.title
  );
  await saveCapture(page, {
    close: resolvedOptions.close ?? true,
    expectSavedNotification: resolvedOptions.expectSavedNotification
  });
  return label;
}

/** Create multiple memory nodes through Capture and return their labels. */
export async function createNodesViaCapture(
  page: Page,
  count: number,
  options: CreateMemoryNodeOptions = {}
) {
  const labels: string[] = [];
  const prefix = options.label ?? options.prefix ?? "E2E node";
  for (let index = 1; index <= count; index += 1) {
    labels.push(
      await createNodeViaCapture(page, {
        ...options,
        label: undefined,
        prefix: `${prefix} ${index}`
      })
    );
  }
  return labels;
}

/** Open the Library Nodes resource browser. */
export async function openNodesLibrary(page: Page) {
  await openLibraryAndTab(page, LibraryTab.Nodes);
  const contract = requireResourceBrowseContract(
    test.info().project.name,
    "node"
  );
  await expect(getResourceRecordsContainer(page, contract)).toBeVisible({
    timeout: 15_000
  });
}

/** Assert the node record opened by Capture is visible with its saved data. */
export async function expectSavedNodeRecordVisible(
  page: Page,
  nodeName: string
) {
  const recordSurface = page.getByTestId("resource-record-surface");
  await expect(recordSurface).toBeVisible({ timeout: 20_000 });
  await expect(
    recordSurface.getByText(nodeName, { exact: true }).first()
  ).toBeVisible({ timeout: 20_000 });
}

/** Close the active resource record before reopening it through Library. */
export async function closeNodeRecord(page: Page) {
  const recordSurface = page.getByTestId("resource-record-surface");
  const closeButton = recordSurface
    .getByRole("button", { name: /^Close$/i })
    .first();
  await expect(closeButton).toBeVisible({ timeout: 10_000 });
  await closeButton.click({ timeout: 5_000 });
  await expect(recordSurface).toBeHidden({ timeout: 10_000 });
}

/** Assert that a named node is present in the Library Nodes browser. */
export async function expectNodeVisibleInLibrary(page: Page, nodeName: string) {
  await openNodesLibrary(page);
  await expect(getResourceThumbnailByLabel(page, nodeName)).toBeVisible({
    timeout: 20_000
  });
}

/** Locate a named node in the active record's Links panel. */
export function getLinkedNodeItem(page: Page, nodeName: string) {
  return page
    .getByTestId(/^node-link-item:/)
    .filter({ hasText: nodeName })
    .first();
}

/** Locate a named resource in the active linking search results. */
export function getLinkSearchResult(page: Page, resourceName: string) {
  return page
    .getByTestId("link-search-result")
    .filter({ visible: true })
    .filter({ hasText: resourceName })
    .first();
}

/** Open a named node record from the Library Nodes browser. */
export async function openNodeRecordFromLibrary(page: Page, nodeName: string) {
  await openNodesLibrary(page);
  await getResourceThumbnailByLabel(page, nodeName).click({ timeout: 5_000 });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 15_000
  });
}

/** Open a node record by its resource id from the Library Nodes browser. */
export async function openNodeRecordFromLibraryById(
  page: Page,
  nodeId: string
) {
  await openNodesLibrary(page);
  await getResourceThumbnail(page, nodeId).click({ timeout: 5_000 });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 15_000
  });
}
