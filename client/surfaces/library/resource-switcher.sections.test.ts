import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import { resolveLibrarySwitcherSections } from "./resource-switcher.utils";

describe("library switcher sections", () => {
  it("leaves out resource types the switcher does not know", () => {
    const [section] = resolveLibrarySwitcherSections(
      Product.POINTRON,
      [Resource.objective, "not-a-resource" as Resource, Resource.task],
      false
    );
    expect(section.items.map((item) => item.value)).toEqual([
      Resource.objective,
      Resource.task
    ]);
  });
});
