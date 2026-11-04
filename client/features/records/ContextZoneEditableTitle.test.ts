import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get, writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import ContextZoneEditableTitle from "@nucleum/features/records/ContextZoneEditableTitle.svelte";

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn(), info: vi.fn() }
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { error: vi.fn() }
}));
vi.mock("@nucleum/shared-state/resources/edit-mode-finish", () => ({
  registerEditModeFinisher: () => () => undefined
}));

function createStore(label: string) {
  const state = writable({ label, isInEditMode: true });
  const pending: { label: string; resolve: () => void }[] = [];
  const store = {
    subscribe: state.subscribe,
    id: "node:1",
    modify: vi.fn(({ label: next }: { label: string }) => {
      state.update((value) => ({ ...value, label: next }));
      return new Promise<void>((resolve) =>
        pending.push({ label: next, resolve })
      );
    }),
    toggleEditMode: (value: boolean) =>
      state.update((current) => ({ ...current, isInEditMode: value }))
  };
  return { store, state, pending };
}

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function type(input: HTMLInputElement, value: string) {
  await fireEvent.input(input, { target: { value } });
}

describe("ContextZoneEditableTitle", () => {
  it("keeps a confirmed title that matches a save still in flight", async () => {
    const { store, state, pending } = createStore("Original");
    const { getByTestId } = render(ContextZoneEditableTitle, {
      props: {
        store,
        label: "Original",
        placeholder: "Untitled",
        inputLabel: "Title",
        renameLabel: "Rename",
        testId: "title"
      }
    });
    await settle();
    const input = getByTestId("title-input") as HTMLInputElement;
    await type(input, "X");
    await fireEvent.blur(input);
    await type(input, "Y");
    await fireEvent.blur(input);
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    while (pending.length) {
      pending.shift()!.resolve();
      await settle();
    }
    expect(store.modify.mock.calls.map(([value]) => value.label)).toEqual([
      "X",
      "Y",
      "X"
    ]);
    expect(get(state)).toEqual({ label: "X", isInEditMode: false });
  });

  it("does not save a title again when it matches the stored title", async () => {
    const { store, pending } = createStore("Original");
    const { getByTestId } = render(ContextZoneEditableTitle, {
      props: {
        store,
        label: "Original",
        placeholder: "Untitled",
        inputLabel: "Title",
        renameLabel: "Rename",
        testId: "title"
      }
    });
    await settle();
    const input = getByTestId("title-input") as HTMLInputElement;
    await type(input, "X");
    await fireEvent.blur(input);
    pending.shift()!.resolve();
    await settle();
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    await settle();
    expect(store.modify).toHaveBeenCalledTimes(1);
  });
});
