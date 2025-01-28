import type { Action } from "svelte/action";

interface VirtualKeyboardActionParams {
  offset?: number;
  onHeightChange?: (height: string) => void;
  defaultHeight?: string;
}

export const virtualKeyboard: Action<
  HTMLElement,
  VirtualKeyboardActionParams
> = (node, params = {}) => {
  const { defaultHeight = "100%" } = params;

  const handleResize = () => {
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    const newHeight = `${visibleHeight - (params.offset ?? 0)}px`;
    node.style.height = newHeight;
    params.onHeightChange?.(newHeight);
  };

  node.style.height = defaultHeight;

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
  }

  return {
    destroy() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    },
    update(newParams: VirtualKeyboardActionParams) {
      Object.assign(params, newParams);
    }
  };
};
