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
import {
  closeCaptureAfterSave,
  closeCapturePageAfterReset,
  handleSingleNodePostSave
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
  it.each([
    capture,
    MemotronAction.CAPTURE_SECONDARY,
    MemotronAction.CAPTURE_DND
  ])("closes the capture page %s", (page) => {
    visit(`?${AccessMode.PAGE}=${page}`);
    closeCapturePageAfterReset();
    expect(navigation.closeResource).toHaveBeenCalledWith({
      accessMode: AccessMode.PAGE
    });
  });

  it("keeps the page under a capture open in the panel or the overlay", () => {
    for (const mode of [AccessMode.PANEL, AccessMode.OVERLAY]) {
      visit(`?${AccessMode.PAGE}=node%3Aopen&${mode}=${capture}`);
      closeCapturePageAfterReset();
    }
    expect(navigation.closeResource).not.toHaveBeenCalled();
  });
});
