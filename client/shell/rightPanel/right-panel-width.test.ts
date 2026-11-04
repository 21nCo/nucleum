import { describe, expect, it } from "vitest";
import { Size } from "@21n/ui/elements/size.enum";
import { resolveRightPanelWidthClass } from "./right-panel-width";

function classesOf(size: Size | undefined) {
  return resolveRightPanelWidthClass(size).split(" ");
}

describe("resolveRightPanelWidthClass", () => {
  it("maps each tool size to its panel width", () => {
    expect(classesOf(Size.sm)).toContain("w-96");
    expect(classesOf(Size.md)).toContain("w-[32rem]");
    expect(classesOf(undefined)).toContain("w-[32rem]");
    expect(classesOf(Size.lg)).toContain("w-[36rem]");
    expect(classesOf(Size.xl)).toContain("w-1/2");
  });
});
