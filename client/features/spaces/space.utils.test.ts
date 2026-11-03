import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  buildHeadingTree,
  collectChildSpaceIds,
  formatFocusParam,
  indentItem,
  insertItem,
  isSpaceItemOpenable,
  moveItem,
  moveItemToParent,
  moveItemToPosition,
  outdentItem,
  parseFocusParam,
  removeItemById,
  resolveAddBlockReason,
  resolveOpeningProductName,
  resolveSpaceItemResources,
  sanitizeFocusPath,
  spaceReaches,
  resolveTargetLabel,
  updateItemLabel
} from "@nucleum/features/spaces/space.utils";
import {
  decodeSpaceSegment,
  encodeSpaceSegment,
  resolveSpacePath
} from "@nucleum/client/config/space-route";

function resource(id: string, resourceId = `node:${id}`): ISpaceNavItem {
  return {
    id,
    label: id,
    type: SpaceNavItemType.RESOURCE,
    resourceId,
    resourceType: resourceId.split(":")[0] as Resource
  };
}

function section(id: string, children: ISpaceNavItem[] = []): ISpaceNavItem {
  return { id, label: id, type: SpaceNavItemType.SECTION, children };
}

function ids(items: ISpaceNavItem[]): unknown[] {
  return items.map((item) =>
    item.type === SpaceNavItemType.SECTION
      ? { [item.id]: ids(item.children ?? []) }
      : item.id
  );
}

describe("space item tree", () => {
  const flat = () => [resource("a"), resource("b"), resource("c")];

  it("moves an item after a later sibling", () => {
    expect(ids(moveItemToPosition(flat(), "a", "c", "after"))).toEqual([
      "b",
      "c",
      "a"
    ]);
  });

  it("moves an item before an earlier sibling", () => {
    expect(ids(moveItemToPosition(flat(), "c", "a", "before"))).toEqual([
      "c",
      "a",
      "b"
    ]);
  });

  it("moves an item after an adjacent sibling", () => {
    expect(ids(moveItemToPosition(flat(), "a", "b", "after"))).toEqual([
      "b",
      "a",
      "c"
    ]);
  });

  it("moves items into and out of nested sections", () => {
    const items = [resource("a"), section("s", [section("t", [])])];
    const inside = moveItemToPosition(items, "a", "t", "inside");
    expect(ids(inside)).toEqual([{ s: [{ t: ["a"] }] }]);
    const out = moveItemToPosition(inside, "a", "s", "before");
    expect(ids(out)).toEqual(["a", { s: [{ t: [] }] }]);
  });

  it("treats inside a record item as after it", () => {
    expect(ids(moveItemToPosition(flat(), "a", "b", "inside"))).toEqual([
      "b",
      "a",
      "c"
    ]);
  });

  it("refuses to move a section into its own descendant", () => {
    const items = [section("s", [section("t")])];
    expect(moveItemToPosition(items, "s", "t", "inside")).toBe(items);
    expect(moveItemToParent(items, "s", "t")).toBe(items);
  });

  it("moves an item to a parent at an index", () => {
    const items = [resource("a"), section("s", [resource("b")])];
    expect(ids(moveItemToParent(items, "a", "s", 0))).toEqual([
      { s: ["a", "b"] }
    ]);
    expect(ids(moveItemToParent(items, "b", undefined))).toEqual([
      "a",
      { s: [] },
      "b"
    ]);
  });

  it("inserts at the root and only inside sections", () => {
    const items = [resource("a"), section("s")];
    expect(ids(insertItem(items, resource("x"), { index: 0 }))).toEqual([
      "x",
      "a",
      { s: [] }
    ]);
    expect(ids(insertItem(items, resource("x"), { parentId: "s" }))).toEqual([
      "a",
      { s: ["x"] }
    ]);
    expect(ids(insertItem(items, resource("x"), { parentId: "a" }))).toEqual([
      "a",
      { s: [] }
    ]);
  });

  it("removes and renames items without touching the input", () => {
    const items = [section("s", [resource("a")])];
    expect(ids(removeItemById(items, "a"))).toEqual([{ s: [] }]);
    expect(updateItemLabel(items, "a", "Renamed")[0].children?.[0].label).toBe(
      "Renamed"
    );
    expect(items[0].children?.[0].label).toBe("a");
  });

  it("moves siblings up and down within bounds", () => {
    expect(ids(moveItem(flat(), "b", -1))).toEqual(["b", "a", "c"]);
    expect(ids(moveItem(flat(), "c", 1))).toEqual(["a", "b", "c"]);
  });

  it("indents into the section above and outdents after the parent", () => {
    const items = [section("s"), resource("a"), resource("b")];
    const indented = indentItem(items, "a");
    expect(ids(indented)).toEqual([{ s: ["a"] }, "b"]);
    expect(ids(indentItem(indented, "b"))).toEqual([{ s: ["a", "b"] }]);
    expect(ids(indentItem(flat(), "b"))).toEqual(["a", "b", "c"]);
    expect(ids(outdentItem(indented, "a"))).toEqual([{ s: [] }, "a", "b"]);
  });
});

describe("space loops", () => {
  const graph: Record<string, string[]> = {
    "space:root": ["space:child"],
    "space:child": ["space:grand"],
    "space:grand": [],
    "space:other": []
  };
  const childSpaceIds = (id: string) => graph[id] ?? [];

  it("follows nested spaces", () => {
    expect(spaceReaches("space:root", "space:grand", childSpaceIds)).toBe(true);
    expect(spaceReaches("space:grand", "space:root", childSpaceIds)).toBe(
      false
    );
  });

  it("collects child spaces from sections", () => {
    expect(
      collectChildSpaceIds([
        section("s", [resource("x", "space:x")]),
        resource("n")
      ])
    ).toEqual(["space:x"]);
  });

  it("blocks self, duplicates, ancestors and containing spaces", () => {
    const base = {
      currentSpaceId: "space:grand",
      focusChain: ["space:root", "space:child"],
      items: [resource("n", "node:n")],
      childSpaceIds
    };
    expect(resolveAddBlockReason({ ...base, candidateId: "space:grand" })).toBe(
      "This is the current space"
    );
    expect(resolveAddBlockReason({ ...base, candidateId: "node:n" })).toBe(
      "Already in this space"
    );
    expect(
      resolveAddBlockReason({ ...base, candidateId: "space:root" })
    ).toMatch(/loop/);
    expect(
      resolveAddBlockReason({
        ...base,
        focusChain: [],
        candidateId: "space:child"
      })
    ).toMatch(/loop/);
    expect(
      resolveAddBlockReason({ ...base, candidateId: "space:other" })
    ).toBeUndefined();
  });

  it("blocks other spaces while the space graph is unknown", () => {
    const base = {
      currentSpaceId: "space:grand",
      focusChain: [],
      items: [],
      childSpaceIds: undefined
    };
    expect(
      resolveAddBlockReason({ ...base, candidateId: "space:other" })
    ).toMatch(/loops/);
    expect(
      resolveAddBlockReason({ ...base, candidateId: "node:n" })
    ).toBeUndefined();
  });

  it("cuts looped focus paths", () => {
    expect(
      sanitizeFocusPath("space:a", ["space:b", "space:a", "space:c"])
    ).toEqual(["space:b"]);
    expect(sanitizeFocusPath("space:a", ["space:b", "space:b"])).toEqual([
      "space:b"
    ]);
  });

  it("round-trips focus parameters and path segments", () => {
    expect(encodeSpaceSegment("space:abc")).toBe("abc");
    expect(decodeSpaceSegment("abc")).toBe("space:abc");
    expect(decodeSpaceSegment("space:abc")).toBe("space:abc");
    expect(formatFocusParam(["space:a", "space:b"])).toBe("a,b");
    expect(formatFocusParam([])).toBeNull();
    expect(parseFocusParam("a,,b")).toEqual(["space:a", "space:b"]);
    expect(parseFocusParam(null)).toEqual([]);
    expect(resolveSpacePath("space:a", ["space:b"])).toBe("/space/a/b");
  });
});

describe("space items per product", () => {
  it("lists addable record types", () => {
    expect(resolveSpaceItemResources(Product.MEMOTRON)).toEqual([
      Resource.node,
      Resource.collection,
      Resource.space
    ]);
    expect(resolveSpaceItemResources(Product.NUCLEUM)).toEqual([
      Resource.node,
      Resource.collection,
      Resource.objective,
      Resource.space
    ]);
    expect(resolveSpaceItemResources(Product.POINTRON)).toEqual([
      Resource.objective,
      Resource.space
    ]);
  });

  it("names the app that opens unsupported items", () => {
    expect(isSpaceItemOpenable(Resource.objective, Product.MEMOTRON)).toBe(
      false
    );
    expect(
      resolveOpeningProductName(Resource.objective, Product.MEMOTRON)
    ).toBe("Pointron");
    expect(resolveOpeningProductName(Resource.node, Product.POINTRON)).toBe(
      "Memotron"
    );
    expect(
      resolveOpeningProductName(Resource.collection, Product.POINTRON)
    ).toBe("Memotron");
  });
});

describe("heading tree", () => {
  it("nests headings by level", () => {
    const tree = buildHeadingTree([
      { id: "a", label: "A", level: 1 },
      { id: "b", label: "B", level: 2 },
      { id: "c", label: "C", level: 3 },
      { id: "d", label: "D", level: 2 },
      { id: "e", label: "E", level: 1 },
      { id: "f", label: "F", level: 3 }
    ]);
    const shape = (nodes: typeof tree): unknown[] =>
      nodes.map((node) =>
        node.children.length ? { [node.id]: shape(node.children) } : node.id
      );
    expect(shape(tree)).toEqual([{ a: [{ b: ["c"] }, "d"] }, { e: ["f"] }]);
  });
});

describe("target labels", () => {
  it("falls back to the first line of text for untitled pages", () => {
    expect(resolveTargetLabel({ label: " Named " })).toBe("Named");
    expect(
      resolveTargetLabel({ label: "", text: "\n First line \nSecond" })
    ).toBe("First line");
    expect(resolveTargetLabel({ label: "" })).toBeUndefined();
  });
});
