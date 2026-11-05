import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { activeNode, createTestHistory } from "./navigation-history.test.setup";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
import view from "@21n/ui/environment/view.store";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", async () =>
  (await import("./navigation.test.setup")).uiStateStoreStub()
);
vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./navigation.test.setup")).kvDatafnStoreStub()
);

const history = createTestHistory();

beforeEach(() => {
  history.install();
});
afterEach(() => {
  vi.restoreAllMocks();
  view.refresh(1280, 800);
});

function openNavigatorOverlay() {
  history.setSearchParam("overlay", "navigator");
}

function overlay() {
  return new URL(window.location.href).searchParams.get("overlay");
}

describe("navigator opened as an overlay", () => {
  it("closes the navigator overlay when it opens a resource page", () => {
    view.refresh(800, 600);
    openNavigatorOverlay();
    navigation.openResource("node:a", "page" as never);
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(overlay()).toBeNull();
  });

  it("closes the navigator overlay after it opens a trail node", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigatorOverlay();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a")
    );
    expect(activeNode()?.node.id).toBe("node:a");
    expect(overlay()).toBeNull();
  });

  it("closes the navigator overlay when it reopens the open page", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    openNavigatorOverlay();
    navigation.openResource("node:a", "page" as never, {
      origin: "navigator" as never,
      trail: "start"
    });
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(overlay()).toBeNull();
  });

  it("closes the navigator overlay when a resource opens beside the base page", () => {
    view.refresh(800, 600);
    openNavigatorOverlay();
    navigation.openResource("node:a", "beside" as never);
    const params = new URL(window.location.href).searchParams;
    expect(params.get("beside")).toBe("node:a");
    expect(overlay()).toBeNull();
  });

  it("keeps the navigator panel open when a resource opens beside the base page", () => {
    history.setSearchParam("panel", "navigator");
    navigation.openResource("node:a", "beside" as never);
    const params = new URL(window.location.href).searchParams;
    expect(params.get("beside")).toBe("node:a");
    expect(params.get("panel")).toBe("navigator");
  });

  it("leaves other overlays open", () => {
    view.refresh(800, 600);
    history.setSearchParam("overlay", "search");
    navigation.openResource("node:a", "page" as never);
    expect(overlay()).toBe("search");
  });
});

describe("navigator panel shown as a sheet on a constrained landscape view", () => {
  it("closes the navigator sheet after it opens a trail node", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    history.setSearchParam("panel", "navigator");
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a")
    );
    expect(activeNode()?.node.id).toBe("node:a");
    expect(new URL(window.location.href).searchParams.get("panel")).toBeNull();
  });

  it("closes the navigator sheet when a resource opens beside the page", () => {
    view.refresh(800, 600);
    navigation.openResource("node:a", "page" as never);
    history.setSearchParam("panel", "navigator");
    navigation.openResource("node:b", "besidePage" as never);
    const params = new URL(window.location.href).searchParams;
    expect(params.get("besidePage")).toBe("node:b");
    expect(params.get("panel")).toBeNull();
  });
});
