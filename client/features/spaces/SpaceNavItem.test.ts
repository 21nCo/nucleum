import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
import { datafn } from "@nucleum/datafn/datafn.store";
import {
  item,
  navFor
} from "@nucleum/features/spaces/space-nav-item.test.setup";

vi.mock("@nucleum/datafn/datafn.store", async () =>
  (
    await import("@nucleum/features/spaces/space-nav-item.test.setup")
  ).createSpaceNavItemDatafnStub()
);

const nodeSignal = vi.mocked(datafn.node.signal);

describe("SpaceNavItem headings", () => {
  it("shows the heading tree of a Markdown page the app can open", () => {
    nodeSignal.mockClear();
    const { getByRole, getByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.MEMOTRON) }
    });

    expect(getByRole("button", { name: "Collapse Page" })).toBeTruthy();
    expect(getByText("No headings")).toBeTruthy();
    expect(nodeSignal).toHaveBeenCalled();
  });

  it("hides the heading tree of a Markdown page another app opens", () => {
    nodeSignal.mockClear();
    const { getByText, queryByRole, queryByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.POINTRON) }
    });

    expect(getByText("Opens in Memotron")).toBeTruthy();
    expect(queryByRole("button", { name: /Collapse Page|Expand Page/ })).toBe(
      null
    );
    expect(queryByText("No headings")).toBe(null);
    expect(nodeSignal).not.toHaveBeenCalled();
  });
});
