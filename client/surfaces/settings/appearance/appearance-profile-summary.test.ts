import { describe, expect, it } from "vitest";
import { AppStyle } from "@21n/theme/app-style";
import { resolveAppearanceProfileSummary } from "./appearance-profile-summary";

describe("resolveAppearanceProfileSummary", () => {
  it("names one scheme when light and dark share it", () => {
    expect(
      resolveAppearanceProfileSummary({
        lightLabel: "ember",
        darkLabel: "Ember",
        appStyle: AppStyle.Rounded,
        typeface: "Urbanist"
      })
    ).toBe("Ember · Rounded · Urbanist");
  });

  it("names both schemes when they differ", () => {
    expect(
      resolveAppearanceProfileSummary({
        lightLabel: "blue",
        darkLabel: "Oxide",
        appStyle: AppStyle.Semi,
        typeface: "Sen"
      })
    ).toBe("Blue / Oxide · Semi-rounded · Sen");
  });

  it("leaves out missing parts", () => {
    expect(resolveAppearanceProfileSummary({ appStyle: AppStyle.Boxed })).toBe(
      "Boxed"
    );
  });
});
