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

  it("lets kept items shrink to a minimum label width and clips them before the title", () => {
    const { getByTestId, getByText } = render(Breadcrumbs, {
      props: { items, limit: 1, isLeading: true }
    });
    expect(getByTestId("breadcrumbs").classList).toContain("overflow-hidden");
    const label = getByText("Near");
    const wrapper = label.parentElement as HTMLElement;
    expect(label.classList).toContain("truncate");
    expect(wrapper.classList).toContain(
      "grid-cols-[minmax(min(2rem,var(--breadcrumb-label-floor)),max-content)_auto]"
    );
    expect(wrapper.style.getPropertyValue("--breadcrumb-label-floor")).toBe(
      "4ch"
    );
    expect(wrapper.classList).not.toContain("flex-shrink-0");
    expect((wrapper.lastElementChild as HTMLElement).classList).toContain(
      "flex-shrink-0"
    );
  });
});

describe("Breadcrumbs outside leading mode", () => {
  it("keeps items at their natural width", () => {
    const { getByText } = render(Breadcrumbs, {
      props: { items: items.slice(0, 2), limit: 3 }
    });
    const wrapper = getByText("Root").parentElement as HTMLElement;
    expect(wrapper.classList).toContain("flex-shrink-0");
    expect(wrapper.classList).not.toContain("grid");
  });
});
