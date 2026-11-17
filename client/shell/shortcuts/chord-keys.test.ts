import { describe, expect, it } from "vitest";
import {
  isChordEditableTarget,
  isChordStart,
  resolveChordSpaceIndex
} from "./chord-keys";

const press = (
  key: string,
  modifiers: Partial<Record<string, boolean>> = {}
) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers
});

describe("chord keys", () => {
  it("maps G then 1 to 9 to pinned space positions", () => {
    expect(resolveChordSpaceIndex("g", press("1"))).toBe(0);
    expect(resolveChordSpaceIndex("G", press("9"))).toBe(8);
  });

  it("ignores other prefixes, keys and modified presses", () => {
    expect(resolveChordSpaceIndex(undefined, press("1"))).toBeUndefined();
    expect(resolveChordSpaceIndex("h", press("1"))).toBeUndefined();
    expect(resolveChordSpaceIndex("g", press("0"))).toBeUndefined();
    expect(resolveChordSpaceIndex("g", press("c"))).toBeUndefined();
    expect(
      resolveChordSpaceIndex("g", press("1", { metaKey: true }))
    ).toBeUndefined();
  });

  it("starts a chord only on a plain G", () => {
    expect(isChordStart(press("g"))).toBe(true);
    expect(isChordStart(press("G"))).toBe(true);
    expect(isChordStart(press("g", { metaKey: true }))).toBe(false);
    expect(isChordStart(press("G", { shiftKey: true }))).toBe(false);
    expect(isChordStart(press("c"))).toBe(false);
  });
});

describe("isChordEditableTarget", () => {
  const element = (html: string, selector: string) => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector(selector);
  };

  it("treats fields and every kind of editor as typing targets", () => {
    expect(isChordEditableTarget(element(`<input />`, "input"))).toBe(true);
    expect(
      isChordEditableTarget(element(`<div contenteditable="true"></div>`, "div"))
    ).toBe(true);
    expect(
      isChordEditableTarget(
        element(`<div contenteditable="plaintext-only"></div>`, "div")
      )
    ).toBe(true);
    expect(
      isChordEditableTarget(
        element(`<div contenteditable="true"><p><b></b></p></div>`, "b")
      )
    ).toBe(true);
  });

  it("leaves other elements and non-editable islands to chords", () => {
    expect(isChordEditableTarget(element(`<p></p>`, "p"))).toBe(false);
    expect(
      isChordEditableTarget(
        element(
          `<div contenteditable="true"><p contenteditable="false"><b></b></p></div>`,
          "b"
        )
      )
    ).toBe(false);
    expect(isChordEditableTarget(null)).toBe(false);
  });
});
