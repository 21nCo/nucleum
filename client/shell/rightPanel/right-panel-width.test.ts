import { describe, expect, it } from "vitest";
import { Size } from "@21n/ui/elements/size.enum";
import { resolveRightPanelWidthClass } from "./right-panel-width";

describe("resolveRightPanelWidthClass", () => {
  it("maps each tool size to its panel width", () => {
    expect(resolveRightPanelWidthClass(Size.sm)).toContain("w-96");
    expect(resolveRightPanelWidthClass(Size.md)).toContain("w-[32rem]");
    expect(resolveRightPanelWidthClass(undefined)).toContain("w-[32rem]");
    expect(resolveRightPanelWidthClass(Size.lg)).toContain("w-[36rem]");
    expect(resolveRightPanelWidthClass(Size.xl)).toContain("w-1/2");
  });
});
