import { afterEach, describe, expect, it, vi } from "vitest";

import { wordCounter } from "./word-counter.action";

const innerHtml = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")!;

afterEach(() => {
  Object.defineProperty(Element.prototype, "innerHTML", innerHtml);
  document.body.replaceChildren();
});

describe("wordCounter", () => {
  it("counts note text that looks like markup as text and never parses it as HTML", () => {
    const parsed = vi.fn();
    Object.defineProperty(Element.prototype, "innerHTML", {
      ...innerHtml,
      set(this: Element, value: string) {
        parsed(value);
        innerHtml.set!.call(this, value);
      }
    });
    const text = '<img src=x onerror="window.__wordCounterProbe=1"> hello';
    const node = document.createElement("div");
    node.append(document.createTextNode(text));
    document.body.append(node);
    const onUpdate = vi.fn();

    const action = wordCounter(node, { onUpdate });

    expect(parsed).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenLastCalledWith({
      words: 4,
      characters: text.length
    });
    action.destroy();
  });

  it("skips hidden and excluded elements", () => {
    const node = document.createElement("div");
    node.innerHTML =
      '<p>one two</p><span class="placeholder">three</span><span style="display:none">four</span>';
    document.body.append(node);
    const onUpdate = vi.fn();

    const action = wordCounter(node, { onUpdate });

    expect(onUpdate).toHaveBeenLastCalledWith({ words: 2, characters: 7 });
    action.destroy();
  });
});
