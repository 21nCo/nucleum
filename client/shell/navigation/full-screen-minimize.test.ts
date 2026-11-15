import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import view from "@21n/ui/environment/view.store";
import { fullScreen } from "@nucleum/shell/overlays/modal.store";
import { navigation } from "./navigation";
import { createTestHistory } from "./navigation-history.test.setup";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", async () =>
  (await import("./navigation.test.setup")).uiStateStoreStub()
);
vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./navigation.test.setup")).kvDatafnStoreStub()
);

const history = createTestHistory();

beforeEach(() => {
  view.refresh(1280, 800);
  history.install();
});
afterEach(() => {
  vi.restoreAllMocks();
  fullScreen.hide(false);
});

function shown() {
  return history.current().url;
}

function params() {
  return new URL(window.location.href).searchParams;
}

function shiftClick() {
  return new MouseEvent("click", { shiftKey: true });
}

describe("minimizing a page opened straight into full screen", () => {
  it("returns to the base page it was opened from", () => {
    navigation.toggleFullScreen(undefined, "node:a");
    expect(params().get("maxOpened")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe("/home");
  });

  it("returns to the page and its beside page it was maximized from", () => {
    navigation.openResource("node:a", AccessMode.PAGE);
    navigation.openResource("node:b", AccessMode.BESIDE_PAGE);
    const origin = shown();
    expect(params().get(AccessMode.BESIDE_PAGE)).toBe("node:b");

    navigation.toggleFullScreen(AccessMode.BESIDE_PAGE, "node:b");
    expect(params().get(AccessMode.PAGE)).toBe("node:b");
    expect(params().get("max")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
  });

  it("returns to the overlay over the page it was maximized from", () => {
    navigation.openResource("node:a", AccessMode.PAGE);
    navigation.openResource("node:b", AccessMode.OVERLAY);
    const origin = shown();

    navigation.toggleFullScreen(AccessMode.OVERLAY, "node:b");
    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
  });

  it("returns to the space page whose in-place item was maximized", () => {
    navigation.openResource("space:s", AccessMode.PAGE);
    const origin = shown();

    navigation.toggleFullScreen(undefined, "node:item");
    expect(params().get(AccessMode.PAGE)).toBe("node:item");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
    expect(params().get(AccessMode.PAGE)).toBe("space:s");
  });

  it("treats a shift-click open like a maximize", () => {
    navigation.openResource("node:a", AccessMode.PAGE);
    const origin = shown();

    navigation.resourceClickHandler(shiftClick(), "node:b");
    expect(params().get("max")).toBe("true");
    expect(params().get("maxOpened")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
  });

  it("returns to the maximized page a beside page was maximized from", () => {
    navigation.toggleFullScreen(undefined, "node:a");
    navigation.openResource("node:b", AccessMode.BESIDE_PAGE);
    const origin = shown();
    expect(params().get("max")).toBe("true");

    navigation.toggleFullScreen(AccessMode.BESIDE_PAGE, "node:b");
    expect(params().get(AccessMode.PAGE)).toBe("node:b");
    expect(params().get("maxOpened")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
  });

  it("returns to the maximized page a shift-click opened from", () => {
    navigation.toggleFullScreen(undefined, "node:a");
    const origin = shown();

    navigation.resourceClickHandler(shiftClick(), "node:b");
    expect(params().get(AccessMode.PAGE)).toBe("node:b");
    expect(params().get("maxOpened")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
  });

  it("returns to the maximized space whose in-place item was maximized", () => {
    navigation.openResource("space:s", AccessMode.PAGE);
    navigation.toggleFullScreen(AccessMode.PAGE, "space:s");
    const origin = shown();
    expect(params().get("max")).toBe("true");
    expect(params().has("maxOpened")).toBe(false);

    navigation.toggleFullScreen(undefined, "node:item");
    expect(params().get("maxOpened")).toBe("true");

    navigation.minimizeFullScreen();
    expect(shown()).toBe(origin);
    expect(params().get(AccessMode.PAGE)).toBe("space:s");
    expect(params().get("max")).toBe("true");
  });

  it("closes to the base page when no in-app entry led to it", () => {
    history.entries.splice(0, 1, {
      url: "/home?page=node:a&max=true&maxOpened=true"
    });
    history.show();

    navigation.minimizeFullScreen();
    expect(params().has(AccessMode.PAGE)).toBe(false);
    expect(params().has("max")).toBe(false);
    expect(params().has("maxOpened")).toBe(false);
  });
});

describe("minimizing a page that was not opened into full screen", () => {
  it("keeps an already open page and only leaves full screen", () => {
    navigation.openResource("node:a", AccessMode.PAGE);
    navigation.toggleFullScreen(AccessMode.PAGE, "node:a");
    expect(params().get("max")).toBe("true");
    expect(params().has("maxOpened")).toBe(false);

    navigation.minimizeFullScreen();
    expect(params().get(AccessMode.PAGE)).toBe("node:a");
    expect(params().has("max")).toBe(false);
  });

  it("keeps a page reached from inside full screen open", () => {
    navigation.toggleFullScreen(undefined, "node:a");
    navigation.openResource("node:b", AccessMode.PAGE);
    expect(params().get("max")).toBe("true");
    expect(params().has("maxOpened")).toBe(false);

    navigation.minimizeFullScreen();
    expect(params().get(AccessMode.PAGE)).toBe("node:b");
    expect(params().has("max")).toBe(false);
  });
});

describe("a page opened over a full screen overlay", () => {
  it("is not marked as opened into full screen, since the overlay owns it", () => {
    fullScreen.show("focus");
    history.entries.splice(0, 1, { url: "/home?overlay=focus&max=true" });
    history.show();

    navigation.resourceClickHandler(shiftClick(), "node:a");
    expect(params().get(AccessMode.PAGE)).toBe("node:a");
    expect(params().get(AccessMode.OVERLAY)).toBe("focus");
    expect(params().has("maxOpened")).toBe(false);
  });
});
