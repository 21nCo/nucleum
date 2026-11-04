import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Breadcrumbs from "@21n/ui/compositions/navigation/breadcrumbs/Breadcrumbs.svelte";

vi.mock("@21n/ui/actions/popover.action", () => ({
  popover: () => ({ update: () => undefined, destroy: () => undefined }),
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

const items = [
  { id: "goal:root", label: "Root" },
  { id: "goal:middle", label: "Middle" },
  { id: "goal:near", label: "Near" }
];

describe("Breadcrumbs leading into a title", () => {
  it("keeps the nearest items and collapses the rest behind an ellipsis", () => {
    const { queryByText, getByRole } = render(Breadcrumbs, {
      props: { items, limit: 1, isLeading: true }
    });
    expect(queryByText("Near")).toBeTruthy();
    expect(queryByText("Root")).toBeNull();
    expect(queryByText("Middle")).toBeNull();
    expect(
      getByRole("button", { name: "Show hidden breadcrumbs" })
    ).toBeTruthy();
  });

  it("ends every item with a separator and opens a clicked item", async () => {
    const onItemClick = vi.fn();
    const { getByText, getAllByText, queryByRole } = render(Breadcrumbs, {
      props: { items: items.slice(-1), limit: 1, isLeading: true, onItemClick }
    });
    expect(
      queryByRole("button", { name: "Show hidden breadcrumbs" })
    ).toBeNull();
    expect(getAllByText("/")).toHaveLength(1);
    await fireEvent.click(getByText("Near"));
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ item: items[2] })
    );
  });
});
