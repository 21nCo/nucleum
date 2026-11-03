import { describe, expect, it } from "vitest";
import {
  resolveExpandedBorderClass,
  resolvePanelActionStates
} from "./panel-actions";

const actions = ["focus", "rhombus", "navigator"];

describe("resolvePanelActionStates", () => {
  it("keeps every action idle while no grouped panel is open", () => {
    expect(resolvePanelActionStates(actions, null, true)).toEqual({
      focus: "idle",
      rhombus: "idle",
      navigator: "idle"
    });
    expect(resolvePanelActionStates(actions, "settings", true)).toEqual({
      focus: "idle",
      rhombus: "idle",
      navigator: "idle"
    });
  });

  it("expands the open action and compacts the others", () => {
    expect(resolvePanelActionStates(actions, "rhombus", true)).toEqual({
      focus: "compact",
      rhombus: "expanded",
      navigator: "compact"
    });
  });

  it("does not expand when the panel opens as a sheet", () => {
    expect(resolvePanelActionStates(actions, "focus", false)).toEqual({
      focus: "idle",
      rhombus: "idle",
      navigator: "idle"
    });
  });
});

describe("resolveExpandedBorderClass", () => {
  it("borders the expanded action on the sides that face other actions", () => {
    expect(resolveExpandedBorderClass(0, 3)).toBe("border-r");
    expect(resolveExpandedBorderClass(1, 3)).toBe("border-x");
    expect(resolveExpandedBorderClass(2, 3)).toBe("border-l");
    expect(resolveExpandedBorderClass(0, 1)).toBe("");
  });
});
