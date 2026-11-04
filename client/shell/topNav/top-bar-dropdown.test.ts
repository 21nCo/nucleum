import { afterEach, describe, expect, it, vi } from "vitest";
import modalEvent from "@nucleum/shell/overlays/modal.store";
import { topBarDropdown } from "./top-bar-dropdown";

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

function mountDropdown() {
  const node = document.createElement("div");
  const inside = document.createElement("button");
  node.appendChild(inside);
  document.body.appendChild(node);
  const onDismiss = vi.fn();
  const action = topBarDropdown(node, { isOpen: true, onDismiss });
  return { node, inside, onDismiss, action };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("topBarDropdown", () => {
  it("consumes Escape so the layer below stays open", () => {
    const { inside, onDismiss, action } = mountDropdown();
    const bubbled = vi.fn((event: KeyboardEvent) => event.defaultPrevented);
    window.addEventListener("keydown", bubbled);
    inside.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true
      })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(bubbled).toHaveReturnedWith(true);
    window.removeEventListener("keydown", bubbled);
    action.destroy();
  });

  it("keeps keys typed inside open and closes on keys outside", () => {
    const { inside, onDismiss, action } = mountDropdown();
    inside.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(onDismiss).not.toHaveBeenCalled();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    action.destroy();
  });

  it("closes when a modal opens", () => {
    const { onDismiss, action } = mountDropdown();
    modalEvent.notify({ path: "cmd", isShow: true });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    action.destroy();
    modalEvent.reset();
  });

  it("closes on a pointer down outside and stays open on one inside", () => {
    const { inside, onDismiss, action } = mountDropdown();
    inside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    action.destroy();
  });

  it("ignores outside events once updated to closed", () => {
    const { onDismiss, action } = mountDropdown();
    action.update({ isOpen: false, onDismiss });
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    expect(onDismiss).not.toHaveBeenCalled();
    action.destroy();
  });
});
