import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  countWallGroupResources,
  groupWallItems
} from "@nucleum/features/spaces/wall/space-wall.utils";

function resource(id: string): ISpaceNavItem {
  return {
    id,
    label: id,
    type: SpaceNavItemType.RESOURCE,
    resourceId: `node:${id}`,
    resourceType: Resource.node
  };
}

function section(id: string, children: ISpaceNavItem[] = []): ISpaceNavItem {
  return { id, label: id, type: SpaceNavItemType.SECTION, children };
}

describe("groupWallItems", () => {
  it("returns empty levels for an empty or missing tree", () => {
    expect(groupWallItems([])).toEqual({ resources: [], groups: [] });
    expect(groupWallItems(undefined)).toEqual({ resources: [], groups: [] });
  });

  it("keeps root records apart from sections in tree order", () => {
    const level = groupWallItems([
      resource("a"),
      section("s1", [resource("b")]),
      resource("c"),
      section("s2")
    ]);
    expect(level.resources.map((item) => item.id)).toEqual(["a", "c"]);
    expect(level.groups.map((group) => group.section.id)).toEqual(["s1", "s2"]);
    expect(level.groups[0].resources.map((item) => item.id)).toEqual(["b"]);
    expect(level.groups[1]).toMatchObject({ resources: [], groups: [] });
  });

  it("nests sections without a depth limit", () => {
    const level = groupWallItems([
      section("s1", [
        resource("a"),
        section("s2", [section("s3", [resource("b"), resource("c")])])
      ])
    ]);
    const s1 = level.groups[0];
    const s2 = s1.groups[0];
    const s3 = s2.groups[0];
    expect(s1.resources.map((item) => item.id)).toEqual(["a"]);
    expect(s2.resources).toEqual([]);
    expect(s3.section.id).toBe("s3");
    expect(s3.resources.map((item) => item.id)).toEqual(["b", "c"]);
  });
});

describe("countWallGroupResources", () => {
  it("counts records in a section and its nested sections", () => {
    const [group] = groupWallItems([
      section("s1", [
        resource("a"),
        section("s2", [resource("b"), section("s3", [resource("c")])])
      ])
    ]).groups;
    expect(countWallGroupResources(group)).toBe(3);
    expect(countWallGroupResources(group.groups[0].groups[0])).toBe(1);
  });
});
