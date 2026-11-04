import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { activeNode, createTestHistory } from "./navigation-history.test.setup";
import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
import { resolveAccessTrailParent } from "@nucleum/shell/navigator/access-trail";
import view from "@21n/ui/environment/view.store";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", async () =>
  (await import("./navigation.test.setup")).uiStateStoreStub()
);
vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./navigation.test.setup")).kvDatafnStoreStub()
);

const history = createTestHistory();
const entries = history.entries;
let historyBack: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  historyBack = history.install();
});
afterEach(() => {
  vi.restoreAllMocks();
  view.refresh(1280, 800);
});

function openNavigator() {
  history.setSearchParam("panel", "navigator");
}

function panel() {
  return new URL(window.location.href).searchParams.get("panel");
}

describe("page history and access trails", () => {
  it("goes back in history only when the close asks for it", () => {
    navigation.openResource("node:one", "page" as never);
    navigation.closeResource({ accessMode: "page" as never });
    expect(historyBack).not.toHaveBeenCalled();
    expect(new URL(window.location.href).searchParams.has("page")).toBe(false);

    navigation.openResource("node:one", "page" as never);
    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(historyBack).toHaveBeenCalledTimes(1);
  });

  it("returns to the trail page after a pushed close and browser back", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(historyBack).not.toHaveBeenCalled();

    history.go(-1);
    expect(activeNode()?.node.id).toBe("node:b");
    expect(navigation.backInTrail()).toBe(true);
    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(activeNode()?.node.id).toBe("node:a");
  });

  it("follows a history jump to an earlier occurrence of a resource", () => {
    navigation.openResource("node:a", "page" as never);
    const first = activeNode()!.node.key;
    navigation.openResource("node:b", "page" as never);
    navigation.openResource("node:a", "page" as never);
    expect(activeNode()?.node.key).not.toBe(first);

    history.go(-2);
    expect(activeNode()?.node.key).toBe(first);
    navigation.openResource("node:c", "page" as never);
    const { trail, node } = activeNode()!;
    expect(node.id).toBe("node:c");
    expect(trail.nodes[resolveAccessTrailParent(trail)!].key).toBe(first);
  });

  it("records the page it came from when the navigator opens a trail node", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    history.go(-1);
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:b")
    );
    expect(activeNode()?.node.id).toBe("node:b");
    const length = entries.length;
    expect(navigation.backInTrail()).toBe(true);
    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(length);
    expect(activeNode()?.node.id).toBe("node:a");
  });

  it("selects another occurrence of the open resource from the navigator", () => {
    navigation.openResource("node:a", "page" as never);
    const first = activeNode()!.node.key;
    navigation.openResource("node:b", "page" as never);
    navigation.openResource("node:a", "page" as never);
    const length = entries.length;
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.key === first)
    );
    expect(entries).toHaveLength(length + 1);
    expect(activeNode()?.node.key).toBe(first);
    navigation.openResource("node:c", "page" as never);
    const current = activeNode()!;
    expect(
      current.trail.nodes[resolveAccessTrailParent(current.trail)!].key
    ).toBe(first);
  });

  it("records the recreated node when forward reopens a discarded trail", () => {
    navigation.openResource("node:a", "page" as never);
    const discarded = activeNode()!.node.key;
    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(accessTrail.get().current).toBeUndefined();

    history.go(1);
    const recreated = activeNode()!.node.key;
    expect(recreated).not.toBe(discarded);
    expect(
      (
        history.current().state as {
          accessTrail: { position: { node: string } };
        }
      ).accessTrail.position.node
    ).toBe(recreated);

    navigation.openResource("node:b", "page" as never);
    const length = entries.length;
    expect(navigation.backInTrail()).toBe(true);
    expect(historyBack).toHaveBeenCalledTimes(2);
    expect(entries).toHaveLength(length);
    expect(activeNode()?.node.key).toBe(recreated);
  });

  it("closes the portrait navigator sheet after it opens a trail node", () => {
    view.refresh(390, 844);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a")
    );
    expect(activeNode()?.node.id).toBe("node:a");
    expect(panel()).toBeNull();
  });

  it("closes the portrait navigator sheet after it resumes a recent trail", () => {
    view.refresh(390, 844);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.closeResource({ accessMode: "page" as never });
    navigation.openResource("node:b", "page" as never);
    const recent = accessTrail
      .get()
      .recent.find((trail) => trail.nodes[0].id === "node:a")!;
    openNavigator();
    navigation.resumeTrail(recent.key, 0);
    expect(activeNode()?.node.id).toBe("node:a");
    expect(panel()).toBeNull();
  });

  it("keeps the desktop navigator panel open after it opens a trail node", () => {
    view.refresh(1280, 800);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    openNavigator();
    const trail = accessTrail.get().current!;
    navigation.openTrailNode(
      trail.nodes.findIndex((node) => node.id === "node:a")
    );
    expect(activeNode()?.node.id).toBe("node:a");
    expect(panel()).toBe("navigator");
  });
});
