import { cleanup, fireEvent, render } from "@testing-library/svelte";
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

let storeCount = 0;

function createStore(label: string) {
  const state = writable({ label, isInEditMode: true });
  const pending: {
    label: string;
    resolve: () => void;
    reject: (error: Error) => void;
  }[] = [];
  const store = {
    subscribe: state.subscribe,
    id: `node:${++storeCount}`,
    modify: vi.fn(({ label: next }: { label: string }) => {
      const previous = get(state).label;
      state.update((value) => ({ ...value, label: next }));
      return new Promise<void>((resolve, reject) =>
        pending.push({
          label: next,
          resolve,
          reject: (error) => {
            state.update((value) => ({ ...value, label: previous }));
            reject(error);
          }
        })
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

async function renderTitle(store: ReturnType<typeof createStore>["store"]) {
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
  return getByTestId("title-input") as HTMLInputElement;
}

async function queueXThenYThenConfirmX(input: HTMLInputElement) {
  await type(input, "X");
  await fireEvent.blur(input);
  await type(input, "Y");
  await fireEvent.blur(input);
  await type(input, "X");
  await fireEvent.keyDown(input, { key: "Enter" });
}

describe("ContextZoneEditableTitle", () => {
  it("keeps a confirmed title that matches a save still in flight", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await queueXThenYThenConfirmX(input);
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
    const input = await renderTitle(store);
    await type(input, "X");
    await fireEvent.blur(input);
    pending.shift()!.resolve();
    await settle();
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    await settle();
    expect(store.modify).toHaveBeenCalledTimes(1);
  });

  it("saves a confirmed title again when its latest save fails", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await queueXThenYThenConfirmX(input);
    pending.shift()!.resolve();
    await settle();
    pending.shift()!.resolve();
    await settle();
    pending.shift()!.reject(new Error("offline"));
    await settle();
    expect(get(state)).toEqual({ label: "Y", isInEditMode: true });

    await fireEvent.keyDown(input, { key: "Enter" });
    await settle();
    pending.shift()!.resolve();
    await settle();
    expect(store.modify.mock.calls.map(([value]) => value.label)).toEqual([
      "X",
      "Y",
      "X",
      "X"
    ]);
    expect(get(state)).toEqual({ label: "X", isInEditMode: false });
  });

  it("keeps editing open until a title saved after confirming is saved", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    await type(input, "Y");
    await fireEvent.blur(input);
    pending.shift()!.resolve();
    await settle();
    expect(get(state)).toEqual({ label: "Y", isInEditMode: true });

    pending.shift()!.reject(new Error("offline"));
    await settle();
    expect(get(state)).toEqual({ label: "X", isInEditMode: true });
    expect(input.value).toBe("Y");
  });

  it("leaves a reopened editor alone when an earlier confirm finishes after a cancel", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    await fireEvent.keyDown(input, { key: "Escape" });
    await settle();
    store.toggleEditMode(true);
    await settle();
    const reopened = document.querySelector(
      '[data-testid="title-input"]'
    ) as HTMLInputElement;
    await type(reopened, "Y");

    pending.shift()!.resolve();
    await settle();
    expect(store.modify.mock.calls.map(([value]) => value.label)).toEqual([
      "X"
    ]);
    expect(get(state).isInEditMode).toBe(true);
    expect(reopened.value).toBe("Y");
  });

  it("leaves a replacement editor open when the removed editor's confirm finishes", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    cleanup();
    const replacement = await renderTitle(store);
    await type(replacement, "Y");

    pending.shift()!.resolve();
    await settle();
    expect(get(state).isInEditMode).toBe(true);
    expect(replacement.isConnected).toBe(true);
    expect(replacement.value).toBe("Y");
  });

  it("saves a replacement editor's title after the removed editor's save", async () => {
    const { store, state, pending } = createStore("Original");
    const input = await renderTitle(store);
    await type(input, "X");
    await fireEvent.keyDown(input, { key: "Enter" });
    cleanup();
    const replacement = await renderTitle(store);
    await type(replacement, "Y");
    await fireEvent.keyDown(replacement, { key: "Enter" });
    await settle();
    expect(store.modify).toHaveBeenCalledTimes(1);

    pending.shift()!.resolve();
    await settle();
    pending.shift()!.resolve();
    await settle();
    expect(store.modify.mock.calls.map(([value]) => value.label)).toEqual([
      "X",
      "Y"
    ]);
    expect(get(state)).toEqual({ label: "Y", isInEditMode: false });
  });
});
