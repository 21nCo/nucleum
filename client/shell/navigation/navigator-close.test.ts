import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { createTestHistory } from "./navigation-history.test.setup";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", async () =>
  (await import("./navigation.test.setup")).uiStateStoreStub()
);
vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./navigation.test.setup")).kvDatafnStoreStub()
);

const history = createTestHistory();

function isNavigatorOpen() {
  return (
    new URL(window.location.href).searchParams.get("panel") === "navigator"
  );
}

function openNavigator() {
  history.setSearchParam("panel", "navigator");
}

function openTrailPageA(options: { isKeepNavigator: boolean }) {
  const trail = accessTrail.get().current!;
  navigation.openTrailNode(
    trail.nodes.findIndex((node) => node.id === "node:a"),
    options
  );
}

beforeEach(() => {
  history.install();
});
afterEach(() => vi.restoreAllMocks());

describe("navigator after opening a trail item", () => {
  it("closes the navigator when the trail selection asks for it", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    openTrailPageA({ isKeepNavigator: false });
    expect(new URL(window.location.href).searchParams.get("page")).toBe(
      "node:a"
    );
    expect(isNavigatorOpen()).toBe(false);
  });

  it("keeps the navigator open when the trail selection keeps it", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    openTrailPageA({ isKeepNavigator: true });
    expect(isNavigatorOpen()).toBe(true);
  });

  it("closes the navigator when reopening the open page without keeping it", () => {
    navigation.openResource("node:a", "page" as never);
    openNavigator();
    navigation.openResource("node:a", "page" as never, {
      trail: "start",
      isKeepNavigator: false
    });
    expect(isNavigatorOpen()).toBe(false);
  });
});
