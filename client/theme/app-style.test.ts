import { describe, expect, it } from "vitest";

import {
  AppStyle,
  formatAppStyleTokens,
  isFramedAppStyle,
  resolveAppStyle,
  resolveAppStyleTokens
} from "@21n/theme/app-style";

describe("resolveAppStyle", () => {
  it("keeps known styles", () => {
    expect(resolveAppStyle("boxed")).toBe(AppStyle.Boxed);
    expect(resolveAppStyle("semi")).toBe(AppStyle.Semi);
    expect(resolveAppStyle("rounded")).toBe(AppStyle.Rounded);
  });

  it("falls back to boxed for missing or unknown values", () => {
    expect(resolveAppStyle(undefined)).toBe(AppStyle.Boxed);
    expect(resolveAppStyle(null)).toBe(AppStyle.Boxed);
    expect(resolveAppStyle("pill")).toBe(AppStyle.Boxed);
    expect(resolveAppStyle(1)).toBe(AppStyle.Boxed);
  });
});

describe("isFramedAppStyle", () => {
  it("frames every style except boxed", () => {
    expect(isFramedAppStyle(AppStyle.Boxed)).toBe(false);
    expect(isFramedAppStyle(AppStyle.Semi)).toBe(true);
    expect(isFramedAppStyle(AppStyle.Rounded)).toBe(true);
  });
});

describe("resolveAppStyleTokens", () => {
  it("keeps boxed edge to edge", () => {
    const tokens = resolveAppStyleTokens(AppStyle.Boxed);
    expect(tokens["--app-panel-radius"]).toBe("0px");
    expect(tokens["--app-tab-radius"]).toBe("0px");
    expect(tokens["--app-shell-gap"]).toBe("0px");
  });

  it("uses larger radii and pill controls for rounded than semi", () => {
    const semi = resolveAppStyleTokens(AppStyle.Semi);
    const rounded = resolveAppStyleTokens(AppStyle.Rounded);
    expect(semi["--app-panel-radius"]).toBe("0.75rem");
    expect(rounded["--app-panel-radius"]).toBe("1.75rem");
    expect(semi["--app-control-radius"]).toBe("0.375rem");
    expect(rounded["--app-control-radius"]).toBe("9999px");
    expect(semi["--app-shell-gap"]).not.toBe("0px");
  });

  it("drops shell gaps but keeps radii in portrait", () => {
    const tokens = resolveAppStyleTokens(AppStyle.Rounded, true);
    expect(tokens["--app-shell-gap"]).toBe("0px");
    expect(tokens["--app-panel-radius"]).toBe("1.75rem");
  });

  it("does not share token objects between calls", () => {
    const first = resolveAppStyleTokens(AppStyle.Semi);
    first["--app-shell-gap"] = "4px";
    expect(resolveAppStyleTokens(AppStyle.Semi)["--app-shell-gap"]).toBe(
      "0.5rem"
    );
  });
});

describe("formatAppStyleTokens", () => {
  it("serialises tokens as an inline style", () => {
    expect(formatAppStyleTokens(resolveAppStyleTokens(AppStyle.Boxed))).toBe(
      "--app-control-radius: 0.375rem; --app-panel-radius: 0px; --app-tab-radius: 0px; --app-shell-gap: 0px; --app-tab-inset: 0px"
    );
  });
});
