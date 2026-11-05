import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  closeResource: vi.fn(),
  openResource: vi.fn()
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation }));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: vi.fn(), setState: vi.fn() }
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { success: vi.fn() },
  inlineToasts: { success: vi.fn() }
}));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { AccessMode } from "@nucleum/datafn/resource.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { MemotronAction } from "@nucleum/features/memory/memory-action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import {
  closeCaptureAfterSave,
  closeCaptureLayer,
  resetCaptureAfterSave,
  closeCapturePageAfterReset,
  handleSingleNodePostSave,
  isCaptureSaveShortcut
} from "./capture-completion";
import { mountCapture, unmountCaptures } from "./capture-instances.test.setup";
import { resolveShortcutCaptureInstance } from "./capture-instances";

const capture = resourceAction(Resource.node, ResourceActionType.CREATE);
const panelDraftWithCapturePage = `?${AccessMode.PANEL}=${capture}&${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`;

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

afterEach(() => {
  unmountCaptures();
  navigation.closeResource.mockReset();
  navigation.openResource.mockReset();
  visit("");
});

describe("closeCaptureAfterSave", () => {
  it("closes a capture open in the panel and leaves the overlay open", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    closeCaptureAfterSave(false, mountCapture(AccessMode.PANEL));
    expect(navigation.closeResource).toHaveBeenCalledTimes(1);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: capture,
      accessMode: AccessMode.PANEL
    });
  });

  it("closes a capture open in the overlay", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    closeCaptureAfterSave(false, mountCapture(AccessMode.OVERLAY));
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: capture,
      accessMode: AccessMode.OVERLAY
    });
  });

  it("closes a saved Capture page and keeps the panel Capture with its draft", () => {
    visit(panelDraftWithCapturePage);
    closeCaptureAfterSave(false, mountCapture(AccessMode.PAGE));
    expect(navigation.closeResource).toHaveBeenCalledTimes(1);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: MemotronAction.CAPTURE_SECONDARY,
      accessMode: AccessMode.PAGE
    });
  });

  it("keeps the capture open when it opens the saved node", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    closeCaptureAfterSave(true, mountCapture(AccessMode.OVERLAY));
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });
});

describe("handleSingleNodePostSave", () => {
  const node = { id: "node:saved" as const };

  function save(
    layer: AccessMode,
    overrides: { linkedCollectionId?: "collection:linked" } = {}
  ) {
    handleSingleNodePostSave({
      node,
      isConstrainedWidth: false,
      shouldOpenUponSave: true,
      linkedCollectionId: overrides.linkedCollectionId,
      shouldReturnToLinkedCollection: !!overrides.linkedCollectionId,
      source: mountCapture(layer)
    });
  }

  it("closes a panel capture and keeps an unrelated overlay when opening the saved node", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    save(AccessMode.PANEL);
    expect(navigation.openResource).toHaveBeenCalledWith(
      node.id,
      AccessMode.PAGE,
      { searchParams: { [AccessMode.PANEL]: null } }
    );
  });

  it("closes an overlay capture when opening the saved node", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    save(AccessMode.OVERLAY);
    expect(navigation.openResource).toHaveBeenCalledWith(
      node.id,
      AccessMode.PAGE,
      { searchParams: { [AccessMode.OVERLAY]: null } }
    );
  });

  it("closes a panel capture when returning to the linked collection", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    save(AccessMode.PANEL, { linkedCollectionId: "collection:linked" });
    expect(navigation.openResource).toHaveBeenCalledWith(
      "collection:linked",
      AccessMode.PAGE,
      { searchParams: { [AccessMode.PANEL]: null } }
    );
  });

  it("keeps the panel Capture open when a Capture page returns to the linked collection", () => {
    visit(panelDraftWithCapturePage);
    save(AccessMode.PAGE, { linkedCollectionId: "collection:linked" });
    expect(navigation.openResource).toHaveBeenCalledWith(
      "collection:linked",
      AccessMode.PAGE,
      { searchParams: {} }
    );
  });
});

describe("closeCapturePageAfterReset", () => {
  it("closes the page when the cleared capture is the page", () => {
    visit(`?${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`);
    closeCapturePageAfterReset(AccessMode.PAGE);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      accessMode: AccessMode.PAGE
    });
  });

  it("keeps a capture page open when a capture in the panel or the overlay is cleared", () => {
    visit(
      `?${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}&${AccessMode.PANEL}=${capture}`
    );
    closeCapturePageAfterReset(AccessMode.PANEL);
    closeCapturePageAfterReset(AccessMode.OVERLAY);
    closeCapturePageAfterReset(undefined);
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });

  it("keeps the node a save opened in place of the capture page", () => {
    visit(`?${AccessMode.PAGE}=node%3Asaved`);
    closeCapturePageAfterReset(AccessMode.PAGE);
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });
});

describe("isCaptureSaveShortcut", () => {
  const enter = { event: GlobalEvent.ENTER, value: { metaKey: true } };

  it("saves on Cmd+Enter while the capture is visible", () => {
    expect(isCaptureSaveShortcut(enter, true)).toBe(true);
    expect(
      isCaptureSaveShortcut({ event: GlobalEvent.ENTER, value: {} }, true)
    ).toBe(false);
  });

  it("ignores Cmd+Enter while its right panel is hidden under another layer", () => {
    expect(isCaptureSaveShortcut(enter, false)).toBe(false);
  });
});

describe("several Captures open at once", () => {
  it("leaves a replacement Capture open when a slow save from the one it replaced finishes", () => {
    visit(`?${AccessMode.PANEL}=${capture}`);
    const replaced = mountCapture(AccessMode.PANEL);
    unmountCaptures();
    mountCapture(AccessMode.PANEL);

    closeCaptureAfterSave(false, replaced);
    handleSingleNodePostSave({
      node: { id: "node:saved" },
      isConstrainedWidth: false,
      shouldOpenUponSave: true,
      shouldReturnToLinkedCollection: false,
      source: replaced
    });
    expect(navigation.closeResource).not.toHaveBeenCalled();
    expect(navigation.openResource).not.toHaveBeenCalled();
  });

  it("neither opens the node nor returns to the collection after its Capture page closed", () => {
    const closed = mountCapture(AccessMode.PAGE);
    unmountCaptures();
    mountCapture(AccessMode.PAGE);
    visit(`?${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`);

    handleSingleNodePostSave({
      node: { id: "node:saved" },
      isConstrainedWidth: false,
      shouldOpenUponSave: true,
      linkedCollectionId: "collection:linked",
      shouldReturnToLinkedCollection: true,
      source: closed
    });
    expect(navigation.openResource).not.toHaveBeenCalled();
  });

  it("sends Cmd+Enter to the focused Capture, otherwise to the topmost visible one", () => {
    const pageElement = document.createElement("div");
    const input = pageElement.appendChild(document.createElement("input"));
    const page = mountCapture(AccessMode.PAGE, { element: pageElement });
    const panel = mountCapture(AccessMode.PANEL);
    mountCapture(AccessMode.OVERLAY, { isVisible: false });

    expect(resolveShortcutCaptureInstance(input)).toBe(page.instance);
    expect(resolveShortcutCaptureInstance(document.body)).toBe(panel.instance);
  });

  it("closes the Capture page from its own Close control and keeps the panel draft", () => {
    visit(panelDraftWithCapturePage);
    closeCaptureLayer(AccessMode.PAGE);
    expect(navigation.closeResource).toHaveBeenCalledTimes(1);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: MemotronAction.CAPTURE_SECONDARY,
      accessMode: AccessMode.PAGE
    });
  });

  it("keeps a replacement Capture page open when the replaced page's save finishes", () => {
    const saving = mountCapture(AccessMode.PAGE);
    unmountCaptures();
    mountCapture(AccessMode.PAGE);
    visit(`?${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`);

    resetCaptureAfterSave(saving, () =>
      closeCapturePageAfterReset(AccessMode.PAGE)
    );
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });

  it("resets the Capture after its save while it is still mounted", () => {
    const saving = mountCapture(AccessMode.PAGE);
    visit(`?${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`);

    resetCaptureAfterSave(saving, () =>
      closeCapturePageAfterReset(AccessMode.PAGE)
    );
    expect(navigation.closeResource).toHaveBeenCalledWith({
      accessMode: AccessMode.PAGE
    });
  });
});
