import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
import {
  item,
  navFor
} from "@nucleum/features/spaces/space-nav-item.test.setup";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  step: vi.fn((_delta: number) => true),
  stepSub: vi.fn((_delta: number) => true),
  selectAt: vi.fn((_index: number) => true)
}));

vi.mock("@nucleum/datafn/datafn.store", async () =>
  (
    await import("@nucleum/features/spaces/space-nav-item.test.setup")
  ).createSpaceNavItemDatafnStub()
);
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: mocks.runAction })
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    // Option+Shift+Left / Option+Shift+Right resolve to the sub view
    // commands; any other key has no shortcut.
    resolveShortcut: (event: KeyboardEvent) => ({
      shortcut:
        event.altKey && event.shiftKey && event.key === "ArrowLeft"
          ? { action: "previous-sub-view" }
          : event.altKey && event.shiftKey && event.key === "ArrowRight"
            ? { action: "next-sub-view" }
            : undefined,
      modifiers: []
    })
  }
}));
vi.mock("@nucleum/shell/navigation/top-layer", () => ({
  closeTopLayer: vi.fn()
}));
vi.mock("@nucleum/shell/topNav/contextZone/context-zone", () => ({
  contextZone: {
    step: mocks.step,
    stepSub: mocks.stepSub,
    selectAt: mocks.selectAt
  }
}));

import ShortcutRunner from "./ShortcutRunner.svelte";

const subKey = { altKey: true, shiftKey: true };

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
  target.dispatchEvent(event);
  return event;
}

describe("ShortcutRunner sub view keys", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.stepSub.mockReturnValue(true);
    render(ShortcutRunner);
  });

  it("steps the sub switcher on an unconsumed Option+Shift arrow and claims the key", () => {
    const right = press(document.body, "ArrowRight", subKey);
    const left = press(document.body, "ArrowLeft", subKey);

    expect(mocks.stepSub.mock.calls).toEqual([[1], [-1]]);
    expect(right.defaultPrevented).toBe(true);
    expect(left.defaultPrevented).toBe(true);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("keeps the browser default when no sub switcher steps", () => {
    mocks.stepSub.mockReturnValue(false);
    const event = press(document.body, "ArrowRight", subKey);

    expect(mocks.stepSub).toHaveBeenCalledWith(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("leaves an Option+Shift arrow a Space nav row moved in edit mode to that row", () => {
    const onKeyboardMove = vi.fn();
    const { container } = render(SpaceNavItem, {
      props: {
        item,
        nav: { ...navFor(Product.MEMOTRON), isEditMode: true, onKeyboardMove }
      }
    });
    const row = container.querySelector('[data-role="space-item-main"]')!;

    press(row, "ArrowRight", subKey);

    expect(onKeyboardMove).toHaveBeenCalledWith(item.id, "indent");
    expect(mocks.stepSub).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("does not step the sub switcher while a dialog is open", () => {
    document.body.innerHTML = "<dialog open></dialog>";
    const event = press(document.body, "ArrowLeft", subKey);

    expect(mocks.stepSub).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
