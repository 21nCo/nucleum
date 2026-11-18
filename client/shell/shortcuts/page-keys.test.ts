import { afterEach, describe, expect, it } from "vitest";
import { isPlainPageKey } from "./page-keys";

function keyFrom(target: Element, key = "s") {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true
  });
  let result: boolean | undefined;
  const listener = (pressed: Event) => {
    result = isPlainPageKey(pressed as KeyboardEvent);
  };
  window.addEventListener("keydown", listener);
  target.dispatchEvent(event);
  window.removeEventListener("keydown", listener);
  return result;
}

function mount(html: string) {
  document.body.innerHTML = html;
  return (selector: string) => document.querySelector(selector)!;
}

describe("isPlainPageKey in editable content", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("runs on a plain page element", () => {
    const find = mount(`<div id="page" tabindex="0"></div>`);
    expect(keyFrom(find("#page"))).toBe(true);
  });

  it("skips a key typed into a plaintext-only editor", () => {
    const find = mount(
      `<div id="editor" contenteditable="plaintext-only"></div>`
    );
    expect(keyFrom(find("#editor"))).toBe(false);
  });

  it("skips a key typed into a child of an editor", () => {
    const find = mount(
      `<div contenteditable="true"><p><span id="child">text</span></p></div>`
    );
    expect(keyFrom(find("#child"))).toBe(false);
  });

  it("skips a key typed into an input or text area", () => {
    const find = mount(`<input id="input" /><textarea id="area"></textarea>`);
    expect(keyFrom(find("#input"))).toBe(false);
    expect(keyFrom(find("#area"))).toBe(false);
  });

  it("runs on a non-editable island inside an editor", () => {
    const find = mount(
      `<div contenteditable="true"><div contenteditable="false"><button id="island"></button></div></div>`
    );
    expect(keyFrom(find("#island"))).toBe(true);
  });
});
