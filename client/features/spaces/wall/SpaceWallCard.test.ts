import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import SpaceWallCard from "@nucleum/features/spaces/wall/SpaceWallCard.svelte";
import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
import {
  item,
  navFor,
  pageId
} from "@nucleum/features/spaces/space-nav-item.test.setup";

vi.mock(
  "@nucleum/features/collections/thumbnail/CollectionThumbnail.svelte",
  () => ({ default: () => {} })
);
vi.mock("@nucleum/features/focus/goals/thumbnail/GoalThumbnail.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/thumbnail/SpaceThumbnail.svelte", () => ({
  default: () => {}
}));
const nodeThumbnail = vi.hoisted(() => vi.fn());

vi.mock("@nucleum/features/memory/node/thumbnail/NodeThumbnail.svelte", () => ({
  default: nodeThumbnail
}));
vi.mock("@nucleum/features/spaces/wall/SpaceWallPageCard.svelte", () => ({
  default: () => {}
}));

function wallWith(target: Record<string, unknown>): ISpaceWallContext {
  return {
    ...navFor(Product.NUCLEUM),
    spaceId: "space:wall",
    editingSectionId: null,
    targets: { [pageId]: { id: pageId, label: "Page", ...target } },
    collectionCounts: {}
  };
}

describe("SpaceWallCard status", () => {
  it("shows an archived record as its thumbnail instead of a status card", () => {
    const { queryByText } = render(SpaceWallCard, {
      props: { item, wall: wallWith({ isArchived: true }) }
    });
    expect(queryByText("Archived")).toBe(null);
    expect(nodeThumbnail).toHaveBeenCalledTimes(1);
    expect(nodeThumbnail.mock.calls[0][1]).toMatchObject({
      item: { id: pageId, isArchived: true }
    });
  });

  it("shows a record in the trash as a disabled status card", () => {
    const { getByText, getByTitle } = render(SpaceWallCard, {
      props: { item, wall: wallWith({ trashedAt: 1 }) }
    });
    expect(getByText("In trash")).toBeTruthy();
    expect(getByTitle("In trash").getAttribute("aria-disabled")).toBe("true");
  });
});
