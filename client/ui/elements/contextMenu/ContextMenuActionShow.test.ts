import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";

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

  const todayMenu = () => [
    { group: "main", items: [{ value: "today", label: "Go to today" }] }
  ];

  function menuItem(root: ParentNode = document) {
    return root.querySelector<HTMLElement>(
      '#popovers [data-context-menu-item-id="today"]'
    );
  }

  it("returns focus to the trigger when a shown menu is hidden", async () => {
    const { component, getByRole } = render(ContextMenuAction, {
      props: { id: "showHide", menuResolver: todayMenu }
    });
    const trigger = getByRole("button", { name: "Actions" });

    expect(component.show()).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(menuItem()));
    component.hide();

    await waitFor(() => expect(menuItem()).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to the trigger after an action in a shown menu", async () => {
    const onAction = vi.fn();
    const { component, getByRole } = render(ContextMenuAction, {
      props: { id: "showAction", menuResolver: todayMenu, onAction }
    });
    const trigger = getByRole("button", { name: "Actions" });

    component.show();
    await waitFor(() => expect(document.activeElement).toBe(menuItem()));
    await fireEvent.click(menuItem()!);

    await waitFor(() => expect(menuItem()).toBeNull());
    expect(onAction).toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves focus on an element the user moved to outside the menu", async () => {
    const outside = document.createElement("input");
    document.body.append(outside);
    const { component } = render(ContextMenuAction, {
      props: { id: "showOutside", menuResolver: todayMenu }
    });

    component.show();
    await waitFor(() => expect(document.activeElement).toBe(menuItem()));
    outside.focus();
    await fireEvent.click(outside);

    await waitFor(() => expect(menuItem()).toBeNull());
    expect(document.activeElement).toBe(outside);
  });

  it("focuses the checked option of a menu rendered inside a shadow root", async () => {
    document.getElementById("popovers")?.remove();
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    const target = document.createElement("div");
    shadow.append(popovers, target);
    const { component } = render(ContextMenuAction, {
      target,
      props: {
        id: "showShadow",
        menuResolver: () => [
          {
            group: "layout",
            items: [],
            option: {
              label: "Layout",
              options: [
                { value: "columns", label: "Columns" },
                { value: "classic", label: "Classic" }
              ],
              value: "classic",
              onChange: vi.fn()
            }
          }
        ]
      }
    });

    expect(component.show()).toBe(true);

    const checked = await waitFor(() => {
      const option = shadow.querySelector<HTMLElement>(
        '[role="radio"][aria-checked="true"]'
      );
      expect(option?.getAttribute("data-option-value")).toBe("classic");
      return option;
    });
    await waitFor(() => expect(shadow.activeElement).toBe(checked));
  });

  it.each([PopoverTriggerMethod.RIGHT_CLICK, PopoverTriggerMethod.HOVER])(
    "refuses to show a menu whose trigger method is %s",
    (triggerMethod) => {
      const { component, getByRole } = render(ContextMenuAction, {
        props: { id: "showNonClick", menuResolver: todayMenu, triggerMethod }
      });
      const trigger = getByRole("button", { name: "Actions" });
      const addListener = vi.spyOn(trigger, "addEventListener");
      const click = vi.spyOn(trigger, "click");
      const onClose = vi.fn();

      expect(component.show(onClose)).toBe(false);

      expect(addListener).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
      expect(document.querySelector("#popovers .popover")).toBeNull();
      trigger.dispatchEvent(
        new CustomEvent("change", { detail: { open: false } })
      );
      expect(onClose).not.toHaveBeenCalled();
    }
  );
  describe("in a same-origin iframe", () => {
    function renderInFrame(id: string, isRenderAsSibling = true) {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      const frameDocument = frame.contentDocument!;
      const target = frameDocument.createElement("div");
      frameDocument.body.append(target);
      const view = render(ContextMenuAction, {
        target,
        props: { id, menuResolver: todayMenu, isRenderAsSibling }
      });
      const trigger = frameDocument.querySelector<HTMLElement>(
        'button[aria-label="Actions"]'
      )!;
      const item = () =>
        (isRenderAsSibling ? frameDocument : document).querySelector<HTMLElement>(
          '[data-context-menu-item-id="today"]'
        );
      return { ...view, frameDocument, trigger, item };
    }

    it("focuses the menu, then returns focus to the trigger on hide and on an action", async () => {
      const { component, frameDocument, trigger, item } =
        renderInFrame("showFrame");

      expect(component.show()).toBe(true);
      await waitFor(() => expect(frameDocument.activeElement).toBe(item()));
      component.hide();
      await waitFor(() => expect(item()).toBeNull());
      expect(frameDocument.activeElement).toBe(trigger);

      expect(component.show()).toBe(true);
      await waitFor(() => expect(frameDocument.activeElement).toBe(item()));
      await fireEvent.click(item()!);
      await waitFor(() => expect(item()).toBeNull());
      expect(frameDocument.activeElement).toBe(trigger);
    });

    it("keeps focus the user moved to another element in the frame", async () => {
      const { component, frameDocument, item } = renderInFrame("showFrameOut");
      const outside = frameDocument.createElement("input");
      frameDocument.body.append(outside);

      component.show();
      await waitFor(() => expect(frameDocument.activeElement).toBe(item()));
      outside.focus();
      component.hide();

      await waitFor(() => expect(item()).toBeNull());
      expect(frameDocument.activeElement).toBe(outside);
    });
      it.each([
      ["beside the trigger in the frame", true],
      ["in the parent document's popovers", false]
    ])(
      "keeps focus the user moved to the parent document when the menu renders %s",
      async (_where, isRenderAsSibling) => {
        const { component, frameDocument, trigger, item } = renderInFrame(
          "showFrameParent",
          isRenderAsSibling
        );
        const parentInput = document.createElement("input");
        document.body.append(parentInput);

        component.show();
        await waitFor(() => expect(item()).toBeTruthy());
        await waitFor(() =>
          expect(item()!.ownerDocument.activeElement).toBe(item())
        );
        parentInput.focus();
        await fireEvent.click(parentInput);

        await waitFor(() => expect(item()).toBeNull());
        expect(document.activeElement).toBe(parentInput);
        expect(frameDocument.activeElement).not.toBe(trigger);
      }
    );

    it("returns focus to the frame trigger when a menu in the parent document is hidden", async () => {
      const { component, frameDocument, trigger, item } = renderInFrame(
        "showFramePortal",
        false
      );

      component.show();
      await waitFor(() => expect(document.activeElement).toBe(item()));
      component.hide();

      await waitFor(() => expect(item()).toBeNull());
      expect(frameDocument.activeElement).toBe(trigger);
    });
  });
});
