import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  closeResource: vi.fn(),
  openResource: vi.fn()
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation }));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: vi.fn(), setState: vi.fn() }
}));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { AccessMode } from "@nucleum/datafn/resource.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { closeCaptureAfterSave } from "./capture-completion";

const capture = resourceAction(Resource.node, ResourceActionType.CREATE);

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

afterEach(() => {
  navigation.closeResource.mockReset();
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
