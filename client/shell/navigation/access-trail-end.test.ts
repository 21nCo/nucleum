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

function currentIds() {
  return accessTrail.get().current?.nodes.map((node) => node.id);
}

function openTwoPagesAndEndTrail() {
  navigation.openResource("node:a", "page" as never);
  navigation.openResource("node:b", "page" as never);
  navigation.endAccessTrail();
}

function reopenFromNavigator(id: string) {
  navigation.openResource(id, "page" as never, {
    origin: "navigator" as never,
    trail: "start"
  });
}

beforeEach(() => {
  navigation.syncAccessTrail(undefined);
  accessTrail.end();
  history.install();
});
afterEach(() => vi.restoreAllMocks());

describe("ending an access trail while its page stays open", () => {
  it("stays ended when only the navigator opens and closes", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "page" as never);
    navigation.toggleSearchParam({ panel: "navigator" });
    navigation.endAccessTrail();
    expect(accessTrail.get().current).toBeUndefined();

    navigation.toggleSearchParam(["panel"]);
    navigation.toggleSearchParam({ panel: "navigator" });
    expect(accessTrail.get().current).toBeUndefined();
    expect(accessTrail.get().recent[0]?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);
  });

  it("stays ended when a query change keeps the entry's trail state", () => {
    openTwoPagesAndEndTrail();

    navigation.syncAccessTrail("node:b", history.current().state);
    expect(accessTrail.get().current).toBeUndefined();
  });

  it("starts a new trail on the next resource navigation", () => {
    openTwoPagesAndEndTrail();

    navigation.openResource("node:c", "page" as never);
    expect(currentIds()).toEqual(["node:c"]);
  });

  it("follows browser back to another page after ending", () => {
    openTwoPagesAndEndTrail();

    history.go(-1);
    expect(currentIds()).toEqual(["node:a", "node:b"]);
    expect(
      accessTrail.get().current?.nodes[accessTrail.get().current!.active].id
    ).toBe("node:a");
  });

  it("starts a fresh trail when the ended page is reopened from the navigator", () => {
    openTwoPagesAndEndTrail();

    reopenFromNavigator("node:b");
    expect(currentIds()).toEqual(["node:b"]);
    navigation.syncAccessTrail("node:b", history.current().state);
    expect(currentIds()).toEqual(["node:b"]);
    expect(accessTrail.get().recent[0]?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);
  });

  it("starts a fresh trail when the ended page is reopened by a default open", () => {
    openTwoPagesAndEndTrail();
    const entries = history.entries.length;

    navigation.openResource("node:b", "page" as never);
    expect(currentIds()).toEqual(["node:b"]);
    expect(history.entries.length).toBe(entries);
    navigation.syncAccessTrail("node:b", history.current().state);
    expect(currentIds()).toEqual(["node:b"]);
    expect(accessTrail.get().recent[0]?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);

    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(new URL(window.location.href).searchParams.get("page")).toBeNull();
  });

  it("closes a page whose trail restarted instead of going back to the page before it", () => {
    openTwoPagesAndEndTrail();
    reopenFromNavigator("node:b");

    navigation.closeResource({
      accessMode: "page" as never,
      isHistoryBack: true
    });
    expect(new URL(window.location.href).searchParams.get("page")).toBeNull();
  });

  it("follows the page again after it closes and reopens", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.endAccessTrail();
    navigation.closeResource({ accessMode: "page" as never });
    expect(accessTrail.get().current).toBeUndefined();

    navigation.openResource("node:a", "page" as never);
    expect(currentIds()).toEqual(["node:a"]);
  });
});
