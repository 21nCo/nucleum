// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hoverable } from "./hover.action";

describe("client/actions/hover.action", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("does not call onHover after the action is destroyed before the queued callback runs", async () => {
    const node = document.createElement("button");
    document.body.append(node);
    const onHover = vi.fn();
    const action = hoverable(node, { onHover });

    node.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    action.destroy();
    await Promise.resolve();

    expect(onHover).not.toHaveBeenCalled();
  });

  it("calls onHover for normal hover transitions while mounted", async () => {
    const node = document.createElement("button");
    document.body.append(node);
    const onHover = vi.fn();
    const action = hoverable(node, { onHover });

    node.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await Promise.resolve();
    node.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await Promise.resolve();

    expect(onHover).toHaveBeenNthCalledWith(1, true);
    expect(onHover).toHaveBeenNthCalledWith(2, false);
    action.destroy();
  });
});
