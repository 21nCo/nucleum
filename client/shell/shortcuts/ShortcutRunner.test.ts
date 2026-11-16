import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  resolveShortcut: vi.fn(),
  closeTopLayer: vi.fn()
}));

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: mocks.runAction })
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: { resolveShortcut: mocks.resolveShortcut }
}));
vi.mock("@nucleum/shell/navigation/top-layer", () => ({
  closeTopLayer: mocks.closeTopLayer
}));

import ShortcutRunner from "./ShortcutRunner.svelte";

function openModal(placement?: string) {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-blank-modal", "0");
  const panel = document.createElement("div");
  if (placement) panel.setAttribute("data-modal-placement", placement);
  overlay.append(panel);
  document.body.append(overlay);
  return panel;
}

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("ShortcutRunner with a right-side drawer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.resolveShortcut.mockImplementation((event: KeyboardEvent) => ({
      shortcut: { action: `action-${event.key}` },
      modifiers: []
    }));
    render(ShortcutRunner);
  });

  it("does not run shortcuts on the app behind an open drawer", () => {
    openModal("right");
    press("l");

    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("still lets Escape through while the drawer is open", () => {
    openModal("right");
    press("Escape");

    expect(mocks.runAction).toHaveBeenCalledWith("action-Escape");
  });

  it("runs shortcuts when no drawer is on front", () => {
    press("l");

    expect(mocks.runAction).toHaveBeenCalledWith("action-l");
  });

  it("leaves a centred modal on front unchanged", () => {
    openModal();
    press("l");

    expect(mocks.runAction).toHaveBeenCalledWith("action-l");
  });

  it("runs shortcuts again once a modal above the drawer is on front", () => {
    openModal("right");
    openModal();
    press("l");

    expect(mocks.runAction).toHaveBeenCalledWith("action-l");
  });
});
