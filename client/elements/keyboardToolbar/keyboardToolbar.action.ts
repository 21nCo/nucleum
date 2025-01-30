type ISimpleToolbarParams = {
  onHeightChange?: (height: number) => void;
};

export function simpleToolbar(
  node: HTMLElement,
  params?: ISimpleToolbarParams
) {
  function updatePosition() {
    const keyboardHeight =
      window.innerHeight -
      (window.visualViewport?.height ?? window.innerHeight);
    // const keyboardHeight = 300;

    const offsetY = window.visualViewport ? window.visualViewport.offsetTop : 0;
    const bottomOffset = Math.max(0, keyboardHeight - offsetY);
    if (keyboardHeight === 0) {
      node.style.display = "none";
    } else {
      node.style.display = "flex";
      node.style.bottom = `${bottomOffset}px`;
    }
    params?.onHeightChange?.(bottomOffset);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updatePosition);
    // window.visualViewport.addEventListener("scroll", updatePosition);
  }

  // Initial position
  updatePosition();

  return {
    destroy() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updatePosition);
        // window.visualViewport.removeEventListener("scroll", updatePosition);
      }
    }
  };
}

type IMdToolbarParams = {
  offset?: number;
  isPreventDefaultOnKeyboardClose?: boolean;
  onHeightChange?: (height: number) => void;
};

export function mdToolbar(node: HTMLElement, params?: IMdToolbarParams) {
  let { offset = 0, isPreventDefaultOnKeyboardClose = false } = params ?? {};
  function updatePosition() {
    const keyboardHeight =
      window.innerHeight -
      (window.visualViewport?.height ?? window.innerHeight);
    // const keyboardHeight = 300;
    const offsetY = window.visualViewport ? window.visualViewport.offsetTop : 0;
    const bottomOffset = Math.max(0, keyboardHeight - offsetY);
    const elementTopPosition = window.innerHeight - keyboardHeight;
    // console.log({
    //   elementTopPosition,
    //   keyboardHeight,
    //   offsetY,
    //   bottomOffset,
    //   offset
    // });
    if (keyboardHeight === 0 && !isPreventDefaultOnKeyboardClose) {
      node.style.display = "none";
    } else {
      node.style.display = "flex";
      if (!isPreventDefaultOnKeyboardClose) {
        node.style.height = `${keyboardHeight + offset}px`;
        node.style.top = `${elementTopPosition - offset}px`;
      }
    }
    window.dispatchEvent(new CustomEvent("mdtoolbar"));
    params?.onHeightChange?.(bottomOffset);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updatePosition);
  }

  updatePosition();

  return {
    update(newParams: IMdToolbarParams = {}) {
      offset = newParams.offset ?? offset;
      isPreventDefaultOnKeyboardClose =
        newParams.isPreventDefaultOnKeyboardClose ?? false;
      updatePosition();
    },
    destroy() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updatePosition);
      }
    }
  };
}
