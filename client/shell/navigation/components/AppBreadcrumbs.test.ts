import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resourceClickHandler: vi.fn() }));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: {
    resourceClickHandler: mocks.resourceClickHandler,
    gotoPath: vi.fn()
  }
}));
vi.mock("@21n/ui/actions/popover.action", () => ({
  popover: () => ({ update: () => undefined, destroy: () => undefined }),
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

const { default: AppBreadcrumbs } =
  await import("@nucleum/shell/navigation/components/AppBreadcrumbs.svelte");

describe("AppBreadcrumbs", () => {
  it("opens a parent in place of the given resource", async () => {
    const { getByText } = render(AppBreadcrumbs, {
      props: {
        items: [{ label: "Parent goal", resourceId: "goal:parent" }],
        isLeading: true,
        limit: 1,
        replaceId: "goal:current"
      }
    });
    await fireEvent.click(getByText("Parent goal"));
    expect(mocks.resourceClickHandler).toHaveBeenCalledWith(
      expect.anything(),
      "goal:parent",
      { replaceId: "goal:current" }
    );
  });
});
