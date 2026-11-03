import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  hasPinnedSpaceSources,
  planPinnedSpaceItems,
  planPinnedSpaceMenu,
  removeMovedTabs,
  type PinnedSpaceRecord
} from "@nucleum/features/spaces/pinned-space-migration.utils";

function counter() {
  let next = 0;
  return () => `item-${++next}`;
}

const records: Record<string, PinnedSpaceRecord | undefined> = {
  "node:a": { resourceType: Resource.node, label: "Page A" },
  "objective:b": { resourceType: Resource.objective, label: "Goal B" },
  "collection:c": { resourceType: Resource.collection }
};

const pages = [
  { path: "library/objective/all", label: "Library > Objectives > All" },
  { path: "library/node/all", label: "Library > Pages > All" }
];

describe("planPinnedSpaceItems", () => {
  it("adds tabs as records in tab order, then pins as page links in pin order", () => {
    const planned = planPinnedSpaceItems({
      items: [],
      tabIds: ["objective:b", "node:a", "collection:c"],
      records,
      pages,
      createId: counter()
    });
    expect(planned).toEqual([
      {
        id: "item-1",
        type: SpaceNavItemType.RESOURCE,
        label: "Goal B",
        avatar: undefined,
        resourceId: "objective:b",
        resourceType: Resource.objective
      },
      {
        id: "item-2",
        type: SpaceNavItemType.RESOURCE,
        label: "Page A",
        avatar: undefined,
        resourceId: "node:a",
        resourceType: Resource.node
      },
      {
        id: "item-3",
        type: SpaceNavItemType.RESOURCE,
        label: "",
        avatar: undefined,
        resourceId: "collection:c",
        resourceType: Resource.collection
      },
      {
        id: "item-4",
        type: SpaceNavItemType.PAGE,
        label: "Library > Objectives > All",
        path: "library/objective/all"
      },
      {
        id: "item-5",
        type: SpaceNavItemType.PAGE,
        label: "Library > Pages > All",
        path: "library/node/all"
      }
    ]);
  });

  it("skips missing records, the space itself and duplicate sources", () => {
    const planned = planPinnedSpaceItems({
      items: [],
      spaceId: "space:pinned",
      tabIds: ["node:missing", "node:a", "space:pinned", "node:a"],
      records: { ...records, "space:pinned": { resourceType: Resource.space } },
      pages: [pages[0], { ...pages[0], path: "/library/objective/all/" }],
      createId: counter()
    });
    expect(
      planned.map((item) =>
        item.type === SpaceNavItemType.PAGE ? item.path : item.label
      )
    ).toEqual(["Page A", "library/objective/all"]);
  });

  it("skips records and pages already anywhere in the space", () => {
    const items: ISpaceNavItem[] = [
      {
        id: "s",
        label: "Section",
        type: SpaceNavItemType.SECTION,
        children: [
          {
            id: "x",
            label: "",
            type: SpaceNavItemType.RESOURCE,
            resourceId: "node:a",
            resourceType: Resource.node
          },
          {
            id: "y",
            label: "",
            type: SpaceNavItemType.PAGE,
            path: "library/node/all"
          }
        ]
      }
    ];
    const planned = planPinnedSpaceItems({
      items,
      tabIds: ["node:a", "objective:b"],
      records,
      pages,
      createId: counter()
    });
    expect(
      planned.map((item) =>
        item.type === SpaceNavItemType.PAGE ? item.path : item.label
      )
    ).toEqual(["Goal B", "library/objective/all"]);
  });

  it("plans nothing when the same sources run again after their items were added", () => {
    const params = {
      tabIds: ["objective:b", "node:a"],
      records,
      pages,
      createId: counter()
    };
    const first = planPinnedSpaceItems({ ...params, items: [] });
    const second = planPinnedSpaceItems({ ...params, items: first });
    expect(first).toHaveLength(4);
    expect(second).toEqual([]);
  });
});

describe("hasPinnedSpaceSources", () => {
  it("acts only when tabs or resource-type pins remain", () => {
    expect(hasPinnedSpaceSources({})).toBe(false);
    expect(hasPinnedSpaceSources({ tabIds: [], typePins: [] })).toBe(false);
    expect(hasPinnedSpaceSources({ tabIds: ["node:a"] })).toBe(true);
    expect(hasPinnedSpaceSources({ typePins: ["objective"] })).toBe(true);
  });
});

describe("planPinnedSpaceMenu", () => {
  it("keeps pins and spaces added while the run was in progress", () => {
    expect(
      planPinnedSpaceMenu({
        menu: {
          default: ["home"],
          user: ["objective", "node", "collection"],
          spaces: ["space:other"]
        },
        movedPins: ["objective", "node"],
        spaceId: "space:pinned",
        isPinning: true
      })
    ).toEqual({
      default: ["home"],
      user: ["collection"],
      spaces: ["space:other", "space:pinned"],
      pinnedSpaceId: "space:pinned",
      tabsMigrated: true
    });
  });

  it("does not pin the space again when the user unpinned it", () => {
    expect(
      planPinnedSpaceMenu({
        menu: { user: ["objective"], spaces: [], pinnedSpaceId: "space:p" },
        movedPins: ["objective"],
        spaceId: "space:p",
        isPinning: false
      })
    ).toEqual({
      user: [],
      spaces: [],
      pinnedSpaceId: "space:p",
      tabsMigrated: true
    });
  });

  it("marks tabs as moved without a space when nothing was added", () => {
    expect(
      planPinnedSpaceMenu({ menu: {}, movedPins: [], isPinning: false })
    ).toEqual({ user: [], tabsMigrated: true });
  });
});

describe("removeMovedTabs", () => {
  it("keeps tabs opened while the run was in progress", () => {
    expect(
      removeMovedTabs(
        ["node:a", "node:new", "objective:b"],
        ["node:a", "objective:b"]
      )
    ).toEqual(["node:new"]);
  });
});
