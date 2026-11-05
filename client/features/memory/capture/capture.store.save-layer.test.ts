import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  closeResource: vi.fn(),
  openResource: vi.fn()
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation }));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: vi.fn(() => false), setState: vi.fn() }
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { success: vi.fn(), error: vi.fn() },
  inlineToasts: { success: vi.fn() }
}));
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { capture: { mutate: vi.fn(async () => undefined) } }
}));

import { AccessMode } from "@nucleum/datafn/resource.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { MemotronAction } from "@nucleum/features/memory/memory-action.enum";
import { ActiveCaptureStore } from "./capture.store";
import { mountCapture, unmountCaptures } from "./capture-instances.test.setup";

const panelCapture = resourceAction(Resource.node, ResourceActionType.CREATE);
const saved = [{ id: "node:saved" }];

afterEach(() => {
  unmountCaptures();
  navigation.closeResource.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("saving a draft open in two Captures", () => {
  it("closes only the surface of the Capture that saved it", async () => {
    window.history.replaceState(
      null,
      "",
      `/?${AccessMode.PANEL}=${panelCapture}&${AccessMode.PAGE}=${MemotronAction.CAPTURE_SECONDARY}`
    );
    const pageView = ActiveCaptureStore.resolve("capture:shared" as never);
    const panelView = ActiveCaptureStore.resolve("capture:shared" as never);
    expect(panelView).toBe(pageView);

    await pageView.postSave(saved, { source: mountCapture(AccessMode.PAGE) });
    expect(navigation.closeResource).toHaveBeenCalledTimes(1);
    expect(navigation.closeResource).toHaveBeenCalledWith({
      id: MemotronAction.CAPTURE_SECONDARY,
      accessMode: AccessMode.PAGE
    });
  });
});
