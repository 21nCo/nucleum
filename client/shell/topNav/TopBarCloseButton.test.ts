import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TopBarCloseButton from "@nucleum/shell/topNav/TopBarCloseButton.svelte";

vi.mock("@21n/ui/actions/popover.action", () => ({
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

describe("TopBarCloseButton", () => {
  it("closes through its handler when pressed", async () => {
    const onclick = vi.fn();
    const { getByRole } = render(TopBarCloseButton, { props: { onclick } });
    await fireEvent.click(getByRole("button", { name: "Close" }));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("lines up with the app menu column it is given", () => {
    const { getByTestId } = render(TopBarCloseButton, {
      props: { onclick: () => undefined, menuColumn: "icons" }
    });
    expect(getByTestId("top-bar-close").className).toContain("w-[3.5rem]");
  });

  it("names the action it performs", () => {
    const { getByRole } = render(TopBarCloseButton, {
      props: { onclick: () => undefined, label: "Clear selection" }
    });
    expect(getByRole("button", { name: "Clear selection" })).toBeTruthy();
  });
});
