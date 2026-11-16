import { describe, expect, it } from "vitest";
import { shouldRaiseToasts } from "./raised-toasts";

const base = {
  toastCount: 1,
  openModalCount: 1,
  hasConfirmation: false,
  isPortrait: false
};

describe("shouldRaiseToasts", () => {
  it("raises toasts above an open modal in landscape", () => {
    expect(shouldRaiseToasts(base)).toBe(true);
  });

  it("raises toasts above a confirmation without other modals", () => {
    expect(
      shouldRaiseToasts({ ...base, openModalCount: 0, hasConfirmation: true })
    ).toBe(true);
  });

  it("keeps toasts in the top bar when nothing covers it", () => {
    expect(shouldRaiseToasts({ ...base, openModalCount: 0 })).toBe(false);
  });

  it("does nothing without toasts", () => {
    expect(shouldRaiseToasts({ ...base, toastCount: 0 })).toBe(false);
  });

  it("leaves portrait toasts to the bottom stack", () => {
    expect(shouldRaiseToasts({ ...base, isPortrait: true })).toBe(false);
  });
});
