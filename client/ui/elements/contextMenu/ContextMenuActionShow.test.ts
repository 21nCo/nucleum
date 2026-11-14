import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

describe("ContextMenuAction show", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    document.body.append(popovers);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("opens the menu so that one trigger click closes it again", async () => {
    const { component, getByRole } = render(ContextMenuAction, {
      props: {
        id: "showTest",
        menuResolver: () => [
          { group: "main", items: [{ value: "today", label: "Go to today" }] }
        ]
      }
    });

    component.show();
    await waitFor(() =>
      expect(document.querySelector("#popovers .popover")?.textContent).toContain(
        "Go to today"
      )
    );

    await fireEvent.click(getByRole("button", { name: "Actions" }));
    await waitFor(() =>
      expect(document.querySelector("#popovers .popover")).toBeNull()
    );
  });
});
