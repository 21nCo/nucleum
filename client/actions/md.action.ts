type LinkClickHandler = (href: string) => void;

/**
 * @deprecated - using InlineMention and InlineLink components instead both for read mode and edit mode
 * @param node
 * @param options
 * @returns
 */
export function handleMarkdownActions(
  node: HTMLElement,
  options: {
    onLinkClick?: LinkClickHandler;
    onMentionClick?: LinkClickHandler;
  } = {}
) {
  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.matches("button[data-inline-link-href], a.inline-link")) {
      const href = target.matches("button")
        ? target.getAttribute("data-inline-link-href")
        : target.getAttribute("href");
      if (href) {
        event.preventDefault();
        if (options.onLinkClick) {
          options.onLinkClick(href);
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      }
    }

    if (target.matches("button.mention, a.inline-mention")) {
      const mentionId = target.getAttribute("data-resource-id");
      if (mentionId) {
        event.preventDefault();
        if (options.onMentionClick) {
          options.onMentionClick(mentionId);
        } else {
          window.open(`?pop=${mentionId}`, "_blank", "noopener,noreferrer");
        }
      }
    }
  }

  node.addEventListener("click", handleClick);

  return {
    destroy() {
      node.removeEventListener("click", handleClick);
    }
  };
}
