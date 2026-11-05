import { describe, expect, it } from "vitest";
import { isContextTabShown } from "./context-tab";

const empty = {
  isBulkMode: false,
  hasSubject: false,
  hasActiveEntry: false,
  isHomePage: false
};

describe("isContextTabShown", () => {
  it("shows the tab on the home page without a subject or entry, for its date", () => {
    expect(isContextTabShown({ ...empty, isHomePage: true })).toBe(true);
  });

  it("hides the tab on other pages with nothing to show", () => {
    expect(isContextTabShown(empty)).toBe(false);
  });

  it("shows the tab for a bulk selection, a subject or an entry", () => {
    expect(isContextTabShown({ ...empty, isBulkMode: true })).toBe(true);
    expect(isContextTabShown({ ...empty, hasSubject: true })).toBe(true);
    expect(isContextTabShown({ ...empty, hasActiveEntry: true })).toBe(true);
  });
});
