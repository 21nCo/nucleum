import type { Action } from "svelte/action";

interface ActiveHeightActionParams {
  offset?: number;
  onHeightChange?: (height: string) => void;
  defaultHeight?: string;
}

export const activeHeight: Action<HTMLElement, ActiveHeightActionParams> = (
  node,
  params = {}
) => {
  const { defaultHeight = "100%" } = params;

  const handleResize = (event?: Event) => {
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    const isVirtualKeyboardPresent =
      window.innerHeight -
        (window.visualViewport?.height ?? window.innerHeight) !==
      0;

    let toolbarHeight = 0;
    if (event?.type === "mdtoolbar" && !isVirtualKeyboardPresent) {
      const toolbar = document.querySelector(".mdtoolbar");
      if (toolbar) {
        toolbarHeight = toolbar.getBoundingClientRect().height;
      }
    }

    const newHeight = `${visibleHeight - (params.offset ?? 0) - toolbarHeight}px`;
    node.style.height = newHeight;
    params.onHeightChange?.(newHeight);
  };

  node.style.height = defaultHeight;

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
  }
  window.addEventListener("mdtoolbar", handleResize);

  return {
    destroy() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("mdtoolbar", handleResize);
    },
    update(newParams: ActiveHeightActionParams) {
      Object.assign(params, newParams);
    }
  };
};
