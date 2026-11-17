import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  window.matchMedia = (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  })) as never;
  return {
    view: writable({ isConstrainedWidth: false, isPortrait: false })
  };
});

vi.mock("@21n/ui/environment/view.store", () => ({ default: mocks.view }));
vi.mock("@nucleum/shared-state/resources/action-renderer", async () => {
  const stub =
    await import("../../../tests/fixtures/components/ActionRendererStub.svelte");
  return { requireActionRenderer: () => stub.default };
});

import { Placement } from "@21n/ui/elements/direction.enum";
import modalEvent, { configureOverlayHost, player } from "./modal.store";
import ModalLayer from "./ModalLayer.svelte";

function miniPlayer(container: HTMLElement) {
  return container
    .querySelector('[data-path="mini-player"]')
    ?.closest(".fixed") as HTMLElement;
}

describe("ModalLayer mini player with a right-side drawer", () => {
  beforeEach(() => {
    configureOverlayHost({
      onDismiss: vi.fn(),
      openFullscreen: vi.fn(),
      closeFullscreen: vi.fn(),
      resolvePlayer: vi.fn(() => "mini-player")
    });
    modalEvent.reset();
    player.reset();
    player.showMini("mini-player");
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
  });

  it("sits below the drawer and is inert while the drawer is open, then returns on close", async () => {
    const { container } = render(ModalLayer);
    expect(miniPlayer(container).className).toContain("z-[100]");

    modalEvent.notify({
      path: "appearance-settings",
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    await waitFor(() => expect(miniPlayer(container).inert).toBe(true));
    expect(miniPlayer(container).className).toContain("z-40");
    expect(miniPlayer(container).className).not.toContain("z-[100]");

    modalEvent.hide("appearance-settings");
    await waitFor(() => expect(miniPlayer(container).inert).toBeFalsy());
    expect(miniPlayer(container).className).toContain("z-[100]");
  });

  it("stays above a centred modal as before", async () => {
    const { container } = render(ModalLayer);
    modalEvent.notify({ path: "cmd", isShow: true });
    await waitFor(() =>
      expect(container.querySelector("[data-blank-modal]")).not.toBeNull()
    );

    expect(miniPlayer(container).className).toContain("z-[100]");
    expect(miniPlayer(container).inert).toBeFalsy();
  });
});
