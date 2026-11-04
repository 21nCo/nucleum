import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ toggleSearchParam: vi.fn() }));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: {
    toggleSearchParam: mocks.toggleSearchParam,
    gotoPath: vi.fn()
  }
}));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => undefined, setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

import view from "@21n/ui/environment/view.store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { ActionType } from "@nucleum/client/config/action.type";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { actionRunner } from "@nucleum/surfaces/commands/action-runner";

function visit(search: string) {
  window.history.replaceState(null, "", `/home${search}`);
}

beforeEach(() => {
  mocks.toggleSearchParam.mockClear();
  appStore.update((store) => ({
    ...store,
    actions: [
      {
        action: "navigator",
        label: "Navigator",
        type: ActionType.LIVE,
        accessMode: AccessMode.PANEL
      },
      {
        action: "search",
        label: "Search",
        type: ActionType.LIVE,
        accessMode: AccessMode.OVERLAY
      }
    ]
  }));
});

describe("opening a live action as an overlay over a page", () => {
  it("keeps the page when the navigator falls back to an overlay", () => {
    view.refresh(800, 600);
    visit("?page=node:a&max=true");
    actionRunner.runAction("navigator");
    expect(mocks.toggleSearchParam).toHaveBeenLastCalledWith({
      overlay: "navigator"
    });
  });

  it("closes the page for any other overlay", () => {
    view.refresh(1280, 800);
    visit("?page=node:a");
    actionRunner.runAction("search");
    expect(mocks.toggleSearchParam).toHaveBeenLastCalledWith({
      page: null,
      besidePage: null,
      max: null,
      overlay: "search"
    });
  });
});
