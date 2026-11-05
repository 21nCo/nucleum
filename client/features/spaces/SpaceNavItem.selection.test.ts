import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
import { SpaceNavItemType } from "@nucleum/features/spaces/space.type";
import {
  item,
  navFor
} from "@nucleum/features/spaces/space-nav-item.test.setup";

vi.mock("@nucleum/datafn/datafn.store", async () =>
  (
    await import("@nucleum/features/spaces/space-nav-item.test.setup")
  ).createSpaceNavItemDatafnStub()
);

describe("SpaceNavItem selection in framed app styles", () => {
  it("marks the open row with a raised background and an accent label", () => {
    const { getByText } = render(SpaceNavItem, {
      props: {
        item,
        nav: { ...navFor(Product.MEMOTRON), activeItemId: item.id }
      }
    });
    const label = getByText("Page");
    const row = label.closest("[data-role='space-item-main']")
      ?.parentElement as HTMLElement;
    expect(row.className).toContain("app-framed:bg-bgs3");
    expect(label.className).toContain("app-framed:text-aps1");
  });

  it("marks the section items are added to the same way", () => {
    const section = {
      id: "section-a",
      label: "Section",
      type: SpaceNavItemType.SECTION,
      children: []
    };
    const { getByText } = render(SpaceNavItem, {
      props: {
        item: section as never,
        nav: {
          ...navFor(Product.MEMOTRON),
          isEditMode: true,
          targetSectionId: section.id
        }
      }
    });
    const label = getByText("Section");
    expect(label.className).toContain("app-framed:text-aps1");
  });

  it("leaves other rows unmarked", () => {
    const { getByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.MEMOTRON) }
    });
    expect(getByText("Page").className).not.toContain("app-framed:text-aps1");
  });
});
