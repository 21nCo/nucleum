import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import TextInput from "./TextInput.svelte";

describe("TextInput controls", () => {
  it("names the save and cancel controls when saving is offered", () => {
    render(TextInput, {
      value: "Draft",
      hasControls: true,
      isShowSaveControl: true
    });

    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("names a clear-only control Clear", () => {
    render(TextInput, {
      value: "query",
      hasControls: true,
      isShowClearControl: true
    });

    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("uses the labels a consumer passes", () => {
    render(TextInput, {
      value: "Draft",
      hasControls: true,
      isShowClearControl: true,
      saveControlLabel: "Save name",
      cancelControlLabel: "Discard name"
    });

    expect(screen.getByRole("button", { name: "Discard name" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save name" })).toBeNull();
  });

  it("makes the text input read-only only when asked", () => {
    const { unmount } = render(TextInput, { value: "Draft", testId: "field" });
    expect((screen.getByTestId("field") as HTMLInputElement).readOnly).toBe(
      false
    );
    unmount();

    render(TextInput, { value: "Draft", testId: "field", isReadOnly: true });
    expect((screen.getByTestId("field") as HTMLInputElement).readOnly).toBe(
      true
    );
  });
});
