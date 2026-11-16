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
    // Option+Left / Option+Right resolve to the context view commands; any
    // other key has no shortcut.
    resolveShortcut: (event: KeyboardEvent) => ({
      shortcut:
        event.altKey && event.key === "ArrowLeft"
          ? { action: "previous-context-view" }
          : event.altKey && event.key === "ArrowRight"
            ? { action: "next-context-view" }
            : undefined,
      modifiers: []
    })
  }
}));
vi.mock("@nucleum/shell/navigation/top-layer", () => ({
  closeTopLayer: vi.fn()
}));
vi.mock("@nucleum/shell/topNav/contextZone/context-zone", () => ({
  contextZone: { step: mocks.step, selectAt: mocks.selectAt }
}));

import ShortcutRunner from "./ShortcutRunner.svelte";

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

describe("ShortcutRunner context view keys", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.step.mockReturnValue(true);
    mocks.selectAt.mockReturnValue(true);
    render(ShortcutRunner);
  });

  it("leaves an Option arrow a Space nav row moved in edit mode to that row", () => {
    const onKeyboardMove = vi.fn();
    const { container } = render(SpaceNavItem, {
      props: {
        item,
        nav: { ...navFor(Product.MEMOTRON), isEditMode: true, onKeyboardMove }
      }
    });
    const row = container.querySelector('[data-role="space-item-main"]')!;

    press(row, "ArrowRight", { altKey: true });
    press(row, "ArrowLeft", { altKey: true });

    expect(onKeyboardMove.mock.calls).toEqual([
      [item.id, "indent"],
      [item.id, "outdent"]
    ]);
    expect(mocks.step).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("steps views on an Option arrow nobody consumed and claims the key", () => {
    const right = press(document.body, "ArrowRight", { altKey: true });
    const left = press(document.body, "ArrowLeft", { altKey: true });

    expect(mocks.step.mock.calls).toEqual([[1], [-1]]);
    expect(right.defaultPrevented).toBe(true);
    expect(left.defaultPrevented).toBe(true);
  });

  it("keeps the browser default for an Option arrow when no view switches", () => {
    mocks.step.mockReturnValue(false);
    const event = press(document.body, "ArrowLeft", { altKey: true });

    expect(mocks.step).toHaveBeenCalledWith(-1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("keeps the browser default for an Option arrow while a dialog is open", () => {
    document.body.innerHTML = "<dialog open></dialog>";
    const event = press(document.body, "ArrowRight", { altKey: true });

    expect(mocks.step).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not select a view by number for a key another handler consumed", () => {
    const consumer = document.createElement("div");
    consumer.addEventListener("keydown", (event) => event.preventDefault());
    document.body.append(consumer);

    press(consumer, "2");

    expect(mocks.selectAt).not.toHaveBeenCalled();
  });

  it("selects a view by number for an unconsumed key", () => {
    const event = press(document.body, "2");

    expect(mocks.selectAt).toHaveBeenCalledWith(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
