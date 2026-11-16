import { describe, expect, it } from "vitest";
import { MetaResource, Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import { resolveIndicatorResources } from "./classicCalendarIndicator.utils";

describe("calendar indicator resources", () => {
  it("returns the same array for the same product", () => {
    for (const product of [
      Product.NUCLEUM,
      Product.POINTRON,
      Product.MEMOTRON,
      undefined
    ]) {
      expect(resolveIndicatorResources(product)).toBe(
        resolveIndicatorResources(product)
      );
    }
  });

  it("lists each product's indicator resources", () => {
    expect(resolveIndicatorResources(Product.POINTRON)).toEqual([
      Resource.task,
      Resource.session
    ]);
    expect(resolveIndicatorResources(Product.MEMOTRON)).toEqual([
      Resource.node,
      MetaResource.calendarNotes
    ]);
    expect(resolveIndicatorResources(Product.NUCLEUM)).toEqual([
      Resource.task,
      Resource.session,
      Resource.node,
      MetaResource.calendarNotes
    ]);
    expect(resolveIndicatorResources(undefined)).toEqual([]);
  });
});
