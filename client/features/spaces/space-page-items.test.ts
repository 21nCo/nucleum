import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import {
  SpaceNavItemType,
  type ISpaceNavItem
} from "@nucleum/features/spaces/space.type";
import {
  collectPageItems,
  collectResourceItems,
  countNavItems,
  flattenNavItems,
  indentItem,
  moveItemToPosition,
  normalizeSpacePagePath,
  removeItemById,
  resolveAddBlockReason,
  resolveSpacePageRoute,
  resolveSpacePageStatus
} from "@nucleum/features/spaces/space.utils";
import { groupWallItems } from "@nucleum/features/spaces/wall/space-wall.utils";

function page(id: string, path = `library/${id}/all`): ISpaceNavItem {
  return { id, label: id, type: SpaceNavItemType.PAGE, path };
}

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

function action(path: string, label: string): IAction {
  return {
    action: path.replaceAll("/", "."),
    path,
    label,
    type: ActionType.PAGE
  };
}

describe("space page links in the item tree", () => {
  const tree = () => [
    page("objective"),
    section("s", [resource("a"), page("node")]),
    resource("b")
  ];

  it("lists page links apart from record items", () => {
    expect(collectPageItems(tree()).map((item) => item.id)).toEqual([
      "objective",
      "node"
    ]);
    expect(collectResourceItems(tree()).map((item) => item.id)).toEqual([
      "a",
      "b"
    ]);
    expect(flattenNavItems(tree())).toHaveLength(5);
    expect(countNavItems(tree())).toEqual({ sections: 1, resources: 4 });
  });

  it("moves, indents and removes page links like records", () => {
    const moved = moveItemToPosition(tree(), "objective", "a", "after");
    expect(
      moved.flatMap((item) =>
        item.type === SpaceNavItemType.SECTION
          ? (item.children ?? []).map((child) => child.id)
          : []
      )
    ).toEqual(["a", "objective", "node"]);
    const indented = indentItem([section("s"), page("objective")], "objective");
    expect(indented).toHaveLength(1);
    expect(indented[0].children?.[0]).toMatchObject({
      type: SpaceNavItemType.PAGE,
      path: "library/objective/all"
    });
    expect(
      flattenNavItems(removeItemById(tree(), "node")).map((item) => item.id)
    ).toEqual(["objective", "s", "a", "b"]);
  });

  it("does not treat page links as records when adding", () => {
    expect(
      resolveAddBlockReason({
        candidateId: "objective",
        currentSpaceId: "space:x",
        focusChain: [],
        items: tree(),
        childSpaceIds: () => []
      })
    ).toBeUndefined();
  });

  it("shows page links as wall cards", () => {
    const level = groupWallItems(tree());
    expect(level.resources.map((item) => item.id)).toEqual(["objective", "b"]);
    expect(level.groups[0].resources.map((item) => item.id)).toEqual([
      "a",
      "node"
    ]);
  });
});

describe("space page routes", () => {
  const library: IAction = {
    action: "library",
    label: "Library",
    icon: "library",
    type: ActionType.PAGE
  };
  const collections: IAction = {
    ...action("library/collection/all", "Library > Collections > All"),
    subViewOf: "library"
  };
  const calendar = action("calendar", "Calendar");
  const actions = [library, collections, calendar];

  it("normalizes surrounding slashes", () => {
    expect(normalizeSpacePagePath("/library/objective/all/")).toBe(
      "library/objective/all"
    );
    expect(normalizeSpacePagePath("  ")).toBe("");
  });

  it("uses the page or sub-view registered for exactly the path", () => {
    expect(resolveSpacePageRoute(actions, "/library/collection/all")).toEqual({
      action: collections,
      label: "Library > Collections > All"
    });
    expect(resolveSpacePageRoute(actions, "calendar")).toEqual({
      action: calendar,
      label: "Calendar"
    });
  });

  it("falls back to the page whose sub-path the link is, without its label", () => {
    expect(resolveSpacePageRoute(actions, "library/objective/all")).toEqual({
      action: library
    });
  });

  it("marks links to pages the product lacks as unsupported", () => {
    expect(resolveSpacePageRoute(actions, "overview/day")).toBeUndefined();
    expect(resolveSpacePageRoute(actions, "")).toBeUndefined();
    expect(
      resolveSpacePageStatus(resolveSpacePageRoute(actions, "calendar"))
    ).toBeUndefined();
    expect(resolveSpacePageStatus(undefined)).toEqual({
      kind: "unsupported",
      text: "Not available in this app"
    });
  });
});
