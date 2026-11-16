import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ResourceInlineCloseButton from "@nucleum/shell/navigation/components/ResourceInlineCloseButton.svelte";

const mocks = vi.hoisted(() => ({ closeResource: vi.fn() }));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { closeResource: mocks.closeResource }
}));

describe("ResourceInlineCloseButton inside a host page", () => {
  it("closes through the host when the resource is shown in place", async () => {
    const onClose = vi.fn();
    const { getByRole } = render(ResourceInlineCloseButton, {
      props: { id: "collection:a", onClose }
    });
    await fireEvent.click(getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.closeResource).not.toHaveBeenCalled();
  });

  it("shows no close for an in-place resource without a host close", () => {
    const { queryByRole } = render(ResourceInlineCloseButton, {
      props: { id: "collection:a" }
    });
    expect(queryByRole("button", { name: "Close" })).toBe(null);
  });
});
