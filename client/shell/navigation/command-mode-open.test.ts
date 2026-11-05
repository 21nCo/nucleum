import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "./navigation";
import { createTestHistory } from "./navigation-history.test.setup";
import view from "@21n/ui/environment/view.store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { InteractionMode } from "@21n/ui/elements/keyboard/interaction-mode.type";

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
  setInteractionMode(InteractionMode.DEFAULT);
});

function setInteractionMode(interactionMode: InteractionMode) {
  appStore.update((store) => ({ ...store, interactionMode }));
}

function params() {
  return new URL(window.location.href).searchParams;
}

describe("opening beside a page in command mode", () => {
  it("opens the resource as the page instead of a split it cannot show", () => {
    setInteractionMode(InteractionMode.AGENT);
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "beside" as never, {
      replaceId: "node:a"
    });
    expect(params().get("page")).toBe("node:b");
    expect(params().has("besidePage")).toBe(false);
    expect(params().has("beside")).toBe(false);
  });

  it("still opens a split outside command mode", () => {
    navigation.openResource("node:a", "page" as never);
    navigation.openResource("node:b", "beside" as never, {
      replaceId: "node:a"
    });
    expect(params().get("page")).toBe("node:a");
    expect(params().get("besidePage")).toBe("node:b");
  });
});
