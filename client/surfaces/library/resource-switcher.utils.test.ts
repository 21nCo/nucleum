import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import { availableResources } from "@nucleum/datafn/resource.utils";
import {
  resolveLibrarySwitcherResources,
  resolveLibrarySwitcherSectionResources,
  resolveLibrarySwitcherProducts
} from "./resource-switcher.utils";

const browse: Partial<Record<Product, Resource[]>> = {
  [Product.NUCLEUM]: [Resource.collection, Resource.event],
  [Product.POINTRON]: [
    Resource.objective,
    Resource.task,
    Resource.collection,
    Resource.event
  ],
  [Product.MEMOTRON]: [Resource.node, Resource.collection]
};
const resolveBrowse = (product: Product) => browse[product] ?? [];

describe("library switcher resources", () => {
  it("lists Nucleum, Pointron and Memotron sections in order", () => {
    expect(resolveLibrarySwitcherProducts()).toEqual([
      Product.NUCLEUM,
      Product.POINTRON,
      Product.MEMOTRON
    ]);
  });

  it("leaves resources already in the Nucleum section out of other sections", () => {
    expect(
      resolveLibrarySwitcherSectionResources(
        Product.POINTRON,
        resolveBrowse,
        true
      )
    ).toEqual([Resource.objective, Resource.task]);
  });

  it("combines every section's resources once", () => {
    expect(resolveLibrarySwitcherResources(resolveBrowse, true)).toEqual([
      Resource.collection,
      Resource.event,
      Resource.objective,
      Resource.task,
      Resource.node
    ]);
  });

  it("drops planned resources outside development", () => {
    const planned = Object.values(Resource).find(
      (resource) => !availableResources.has(resource)
    );
    if (!planned) return;
    const withPlanned = (product: Product) =>
      product === Product.NUCLEUM ? [Resource.collection, planned] : [];
    expect(resolveLibrarySwitcherResources(withPlanned, false)).toEqual([
      Resource.collection
    ]);
    expect(resolveLibrarySwitcherResources(withPlanned, true)).toEqual([
      Resource.collection,
      planned
    ]);
  });
});
