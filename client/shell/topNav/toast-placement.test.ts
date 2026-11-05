import { describe, expect, it } from "vitest";
import { isToastBesideActions } from "./toast-placement";

describe("isToastBesideActions", () => {
  it("shows toasts beside the actions when the free space fits them", () => {
    expect(isToastBesideActions(900, 200)).toBe(true);
    expect(isToastBesideActions(520, 200)).toBe(true);
  });

  it("falls back to replacing the right zone when space is short", () => {
    expect(isToastBesideActions(500, 200)).toBe(false);
    expect(isToastBesideActions(600, 600)).toBe(false);
  });
});
