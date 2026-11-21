import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { Orientation } from "@21n/ui/elements/direction.enum";
import SwitchInput from "@21n/ui/elements/toggle/SwitchInput.svelte";
import FormControlLabel from "./FormControlLabel.svelte";
import FormControlLabelWrapper from "./FormControlLabelWrapper.svelte";

afterEach(cleanup);

describe("Form control label wrapping", () => {
  const label =
    "Automatically activate Picture-in-Picture (PiP) on focus start";

  it("keeps existing labels on one line and allows their controls to wrap", () => {
    const { container, getByText } = render(FormControlLabelWrapper, {
      props: { props: { label, orientation: Orientation.Horizontal } }
    });

    expect(getByText(label)).toHaveClass("whitespace-nowrap", "min-w-fit");
    expect(container.firstElementChild).toHaveClass("flex-wrap");
    expect(getByText(label).parentElement).not.toHaveClass("min-w-0");
  });

  it("wraps opted-in labels while keeping the control on the same row", () => {
    const { container, getByText } = render(FormControlLabelWrapper, {
      props: {
        props: { label, orientation: Orientation.Horizontal, isWrapText: true }
      }
    });

    expect(getByText(label)).toHaveClass("whitespace-normal", "min-w-0");
    expect(getByText(label)).not.toHaveClass("whitespace-nowrap", "min-w-fit");
    expect(getByText(label).parentElement).toHaveClass("min-w-0");
    expect(container.firstElementChild).not.toHaveClass("flex-wrap");
  });

  it("supports the label component's explicit wrapping option", () => {
    const { getByText } = render(FormControlLabel, {
      props: { props: { label }, isWrapText: true }
    });

    expect(getByText(label)).toHaveClass("whitespace-normal", "min-w-0");
    expect(getByText(label)).not.toHaveClass("whitespace-nowrap", "min-w-fit");
  });

  it("updates wrapping when the label options change", async () => {
    const { container, getByText, rerender } = render(SwitchInput, {
      label: { label },
      isExpanded: true
    });

    await rerender({
      label: { label, isWrapText: true }
    });

    expect(getByText(label)).toHaveClass("whitespace-normal", "min-w-0");
    expect(container.firstElementChild).not.toHaveClass("flex-wrap");

    await rerender({
      label: { label }
    });

    expect(getByText(label)).toHaveClass("whitespace-nowrap", "min-w-fit");
    expect(container.firstElementChild).toHaveClass("flex-wrap");
  });
});
