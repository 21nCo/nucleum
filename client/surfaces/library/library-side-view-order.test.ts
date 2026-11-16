import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import type { IResourceSwitchItem } from "@21n/ui/elements/select/select.type";
import { resolveLibrarySideViewOrder } from "./resource-switcher.utils";

const item = (value: Resource, isDisabled = false): IResourceSwitchItem => ({
  label: value,
  value,
  isDisabled
});

describe("library side panel view order", () => {
  it("leaves out disabled (Planned) types the switcher cannot select", () => {
    const order = resolveLibrarySideViewOrder([
      {
        section: Product.NUCLEUM,
        items: [item(Resource.tag), item(Resource.task, true)]
      },
      { section: Product.POINTRON, items: [item(Resource.objective)] }
    ]);
    expect(order).toEqual([Resource.tag, Resource.objective]);
  });

  it("keeps the side panel group order and lists a shared type once", () => {
    const order = resolveLibrarySideViewOrder([
      { section: Product.POINTRON, items: [item(Resource.objective)] },
      {
        section: Product.NUCLEUM,
        items: [item(Resource.tag), item(Resource.objective)]
      }
    ]);
    expect(order).toEqual([Resource.objective, Resource.tag]);
  });
});
