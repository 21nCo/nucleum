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
  closeCapturePageAfterReset,
  handleSingleNodePostSave,
  isCaptureSaveShortcut
} from "./capture-completion";

const capture = resourceAction(Resource.node, ResourceActionType.CREATE);

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

afterEach(() => {
  navigation.closeResource.mockReset();
  navigation.openResource.mockReset();
  visit("");
});

describe("closeCaptureAfterSave", () => {
  it("closes a capture open in the panel and leaves the overlay open", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    closeCaptureAfterSave(false);
    expect(navigation.closeResource).toHaveBeenCalledTimes(1);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: capture,
      accessMode: AccessMode.PANEL
    });
  });

  it("closes a capture open in the overlay", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    closeCaptureAfterSave(false);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: capture,
      accessMode: AccessMode.OVERLAY
    });
  });

  it("keeps the capture open when it opens the saved node", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    closeCaptureAfterSave(true);
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });
});

describe("handleSingleNodePostSave", () => {
  const node = { id: "node:saved" as const };

  function save(overrides: { linkedCollectionId?: "collection:linked" } = {}) {
    handleSingleNodePostSave({
      node,
      isConstrainedWidth: false,
      shouldOpenUponSave: true,
      linkedCollectionId: overrides.linkedCollectionId,
      shouldReturnToLinkedCollection: !!overrides.linkedCollectionId
    });
  }

  it("closes a panel capture and keeps an unrelated overlay when opening the saved node", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    save();
    expect(navigation.openResource).toHaveBeenCalledWith(
      node.id,
      AccessMode.PAGE,
      { searchParams: { [AccessMode.PANEL]: null } }
    );
  });

  it("closes an overlay capture when opening the saved node", () => {
    visit(`?${AccessMode.OVERLAY}=${capture}`);
    save();
    expect(navigation.openResource).toHaveBeenCalledWith(
      node.id,
      AccessMode.PAGE,
      { searchParams: { [AccessMode.OVERLAY]: null } }
    );
  });

  it("closes a panel capture when returning to the linked collection", () => {
    visit(`?${AccessMode.PANEL}=${capture}&${AccessMode.OVERLAY}=search`);
    save({ linkedCollectionId: "collection:linked" });
    expect(navigation.openResource).toHaveBeenCalledWith(
      "collection:linked",
      AccessMode.PAGE,
      { searchParams: { [AccessMode.PANEL]: null } }
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
