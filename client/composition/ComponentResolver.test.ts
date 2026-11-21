import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { ActionType } from "@nucleum/client/config/action.type";
import type {
  ActionComponentLoader,
  IAction
} from "@nucleum/shared-state/commands/action.type";
import ActionRendererStub from "@tests/fixtures/components/ActionRendererStub.svelte";
import EmptyStub from "@tests/fixtures/components/EmptyStub.svelte";
import ComponentResolver from "./ComponentResolver.svelte";

vi.mock("@nucleum/client/runtime/context.store", async () => {
  const { readable } = await import("svelte/store");
  return { default: readable({ isSheet: false }) };
});
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: {}
}));
vi.mock("@nucleum/client/runtime/embed/embed.utils", () => ({
  postMessageToParent: vi.fn()
}));
vi.mock(
  "@nucleum/shell/modal/ModalLayout.svelte",
  async () => import("@tests/fixtures/components/EmptyStub.svelte")
);
vi.mock(
  "@nucleum/surfaces/settings/about/SystemStatus.svelte",
  async () => import("@tests/fixtures/components/EmptyStub.svelte")
);
vi.mock("@nucleum/shell/navigation/navigation", () => ({ navigation: {} }));
vi.mock("@21n/ui/actions/resize.action", () => ({ resizeListener: vi.fn() }));
vi.mock("$app/stores", async () => {
  const { readable } = await import("svelte/store");
  return { page: readable({ url: new URL("https://local.nucleum.app/") }) };
});

function pendingComponent() {
  type Module = Awaited<ReturnType<ActionComponentLoader>>;
  let resolve!: (module: Module) => void;
  const promise = new Promise<Module>((done) => (resolve = done));
  return { resolve, load: () => promise };
}

function deferredPage(
  action: string,
  loadComponent: ActionComponentLoader
): IAction {
  return {
    action,
    type: ActionType.PAGE,
    loadComponent,
    componentParams: { path: action }
  };
}

describe("ComponentResolver", () => {
  it("shows loading until the view resolves, then passes its parameters", async () => {
    const view = pendingComponent();
    const screen = render(ComponentResolver, {
      action: deferredPage("library", view.load)
    });

    expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
    expect(screen.queryByTestId("action-renderer")).not.toBeInTheDocument();

    view.resolve({ default: ActionRendererStub });
    expect(await screen.findByTestId("action-renderer")).toHaveAttribute(
      "data-path",
      "library"
    );
    expect(
      screen.queryByRole("status", { name: "Loading" })
    ).not.toBeInTheDocument();
  });

  it("retries a rejected import without losing the action parameters", async () => {
    const load = vi
      .fn<ActionComponentLoader>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ default: ActionRendererStub });
    const screen = render(ComponentResolver, {
      action: deferredPage("library", load)
    });

    expect(await screen.findByText(/this view couldn't load/i)).toBeVisible();
    await fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(load).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("action-renderer")).toHaveAttribute(
      "data-path",
      "library"
    );
  });

  it("ignores a previous action's import resolving after navigation", async () => {
    const previous = pendingComponent();
    const next = pendingComponent();
    const screen = render(ComponentResolver, {
      action: deferredPage("library", previous.load)
    });

    await screen.rerender({ action: deferredPage("overview", next.load) });
    next.resolve({ default: ActionRendererStub });
    expect(await screen.findByTestId("action-renderer")).toHaveAttribute(
      "data-path",
      "overview"
    );

    previous.resolve({ default: EmptyStub });
    await tick();
    expect(screen.getByTestId("action-renderer")).toHaveAttribute(
      "data-path",
      "overview"
    );
  });
});
