import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import {
  SpaceNavItemType,
  type ISpaceResourceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  isSpaceItemBlocked,
  resolveSpaceItemStatus
} from "@nucleum/features/spaces/space.utils";

function item(
  resourceId: string,
  resourceType: Resource
): ISpaceResourceNavItem {
  return {
    id: `item-${resourceId}`,
    label: resourceId,
    type: SpaceNavItemType.RESOURCE,
    resourceId,
    resourceType
  };
}

const base = {
  product: Product.NUCLEUM,
  isTargetsLoaded: true,
  loopIds: new Set<string>()
};

describe("resolveSpaceItemStatus", () => {
  it("returns no status for an available record", () => {
    expect(
      resolveSpaceItemStatus({
        ...base,
        item: item("node:a", Resource.node),
        target: {}
      })
    ).toBeUndefined();
  });

  it("names the product that opens a record the current one cannot", () => {
    const status = resolveSpaceItemStatus({
      ...base,
      product: Product.POINTRON,
      item: item("node:a", Resource.node),
      target: {}
    });
    expect(status?.kind).toBe("unsupported");
    expect(status?.text).toMatch(/^Opens in /);
  });

  it("flags a sub space that is already open above", () => {
    expect(
      resolveSpaceItemStatus({
        ...base,
        loopIds: new Set(["space:a"]),
        item: item("space:a", Resource.space),
        target: {}
      })?.kind
    ).toBe("loop");
  });

  it("flags missing records only after targets load", () => {
    const record = item("node:a", Resource.node);
    expect(
      resolveSpaceItemStatus({ ...base, item: record, isTargetsLoaded: false })
    ).toBeUndefined();
    expect(resolveSpaceItemStatus({ ...base, item: record })?.kind).toBe(
      "missing"
    );
  });

  it("prefers trashed over archived", () => {
    expect(
      resolveSpaceItemStatus({
        ...base,
        item: item("node:a", Resource.node),
        target: { trashedAt: 1, isArchived: true }
      })?.kind
    ).toBe("trashed");
    expect(
      resolveSpaceItemStatus({
        ...base,
        item: item("node:a", Resource.node),
        target: { isArchived: true }
      })?.kind
    ).toBe("archived");
  });
});

describe("isSpaceItemBlocked", () => {
  it("lets archived records open and blocks every other status", () => {
    expect(isSpaceItemBlocked(undefined)).toBe(false);
    expect(isSpaceItemBlocked({ kind: "archived", text: "" })).toBe(false);
    expect(isSpaceItemBlocked({ kind: "trashed", text: "" })).toBe(true);
    expect(isSpaceItemBlocked({ kind: "unsupported", text: "" })).toBe(true);
  });
});
