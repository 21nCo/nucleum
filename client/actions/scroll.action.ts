import { tick } from "svelte";

function isElementInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function scrollIntoViewOnFocus(node: HTMLElement, options: any) {
  const scrollOptions = {
    behavior: options.behavior || "smooth",
    block: options.block || "nearest",
    inline: options.inline || "nearest"
  };

  async function handleFocus() {
    await tick();
    if (!isElementInViewport(node)) {
      node.scrollIntoView(scrollOptions);
    }
  }

  node.addEventListener("focus", handleFocus);

  return {
    update(newOptions: any) {
      Object.assign(scrollOptions, newOptions);
    },
    destroy() {
      node.removeEventListener("focus", handleFocus);
    }
  };
}
