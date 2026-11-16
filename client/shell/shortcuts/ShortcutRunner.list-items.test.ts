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
  stepSub: vi.fn((_delta: number, _query?: unknown) => true),
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
    // Option+Up / Option+Down resolve to the list item commands; any other
    // key has no shortcut.
    resolveShortcut: (event: KeyboardEvent) => ({
      shortcut:
        event.altKey && !event.shiftKey && event.key === "ArrowUp"
          ? { action: "previous-list-item" }
          : event.altKey && !event.shiftKey && event.key === "ArrowDown"
            ? { action: "next-list-item" }
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

const listKey = { altKey: true };
const PAGE_LIST = { axis: "vertical", isModalOpen: false };

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

describe("ShortcutRunner list item keys", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.stepSub.mockReturnValue(true);
    render(ShortcutRunner);
  });

  it("steps the page's vertical list on an unconsumed Option arrow and claims the key", () => {
    const down = press(document.body, "ArrowDown", listKey);
    const up = press(document.body, "ArrowUp", listKey);

    expect(mocks.stepSub.mock.calls).toEqual([
      [1, PAGE_LIST],
      [-1, PAGE_LIST]
    ]);
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("keeps the browser default when no list steps", () => {
    mocks.stepSub.mockReturnValue(false);
    const event = press(document.body, "ArrowDown", listKey);

    expect(mocks.stepSub).toHaveBeenCalledWith(1, PAGE_LIST);
    expect(event.defaultPrevented).toBe(false);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("steps only lists inside a modal while a modal is in front", () => {
    document.body.innerHTML = "<div data-blank-modal></div>";
    const event = press(document.body, "ArrowDown", listKey);

    expect(mocks.stepSub).toHaveBeenCalledWith(1, {
      axis: "vertical",
      isModalOpen: true
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not step the page's list while a dialog is open", () => {
    document.body.innerHTML = "<dialog open></dialog>";
    const event = press(document.body, "ArrowUp", listKey);

    expect(mocks.stepSub).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
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

    press(row, "ArrowDown", listKey);

    expect(onKeyboardMove).toHaveBeenCalledWith(item.id, "down");
    expect(mocks.stepSub).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });
});
