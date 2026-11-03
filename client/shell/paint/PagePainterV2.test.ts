import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable: createStore, get } = require("svelte/store");
  const appState = createStore({ actions: [] as any[], sheetPath: "" });
  return {
    gotoPath: vi.fn(),
    appState,
    page: createStore({ url: new URL("https://local.nucleum.app/calendar") }),
    context: createStore({ isSheet: false }),
    view: createStore({ isPortrait: false }),
    resolveComponentFromPath(path: string) {
      const actions = get(appState).actions;
      return (
        actions.find((x: any) => x.path === path) ??
        actions.find((x: any) => x.action === path) ??
        null
      );
    }
  };
});

vi.mock("$app/navigation", () => ({ afterNavigate: () => {} }));
vi.mock("$app/stores", () => ({ page: mocks.page }));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: mocks.gotoPath }
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: {
    subscribe: mocks.appState.subscribe,
    set: mocks.appState.set,
    update: mocks.appState.update,
    resolveComponentFromPath: mocks.resolveComponentFromPath
  }
}));
vi.mock("@nucleum/client/runtime/context.store", () => ({
  default: mocks.context
}));
vi.mock("@21n/ui/environment/view.store", () => ({ default: mocks.view }));
vi.mock("@nucleum/shared-state/product/product-config-host", () => ({
  requireProductConfig: () => ({ homePath: "calendar", homePathPt: "calendar" })
}));
vi.mock("@nucleum/shared-state/resources/action-renderer", async () => {
  const stub =
    await import("@tests/fixtures/components/ActionRendererStub.svelte");
  return { requireActionRenderer: () => stub.default };
});

import PagePainterV2 from "./PagePainterV2.svelte";

describe("PagePainterV2", () => {
  beforeEach(() => {
    mocks.gotoPath.mockReset();
    mocks.appState.set({ actions: [], sheetPath: "" });
    window.history.replaceState(null, "", "/calendar");
  });

  it("waits for actions to load before resolving the URL page", async () => {
    const { queryByTestId, findByTestId } = render(PagePainterV2);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(queryByTestId("action-renderer")).toBeNull();
    expect(mocks.gotoPath).not.toHaveBeenCalled();

    mocks.appState.update((state: any) => ({
      ...state,
      actions: [
        { action: "calendar", path: "calendar" },
        { action: "404", path: "404" }
      ]
    }));

    const rendered = await findByTestId("action-renderer");
    expect(rendered).toHaveAttribute("data-path", "calendar");
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(mocks.gotoPath).not.toHaveBeenCalled();
  });

  it("renders the not-found page in place for an unknown command page", async () => {
    mocks.appState.set({
      actions: [{ action: "404", path: "404" }],
      sheetPath: ""
    });
    const { findByTestId } = render(PagePainterV2, {
      cmdPageLaunch: "unknown-command"
    });

    const rendered = await findByTestId("action-renderer");
    expect(rendered).toHaveAttribute("data-path", "404");
    expect(rendered).toHaveTextContent("unknown-command");
    await waitFor(() => expect(mocks.gotoPath).not.toHaveBeenCalled());
  });
});
