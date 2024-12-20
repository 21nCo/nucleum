type LinkClickHandler = (href: string) => void;

export function handleMarkdownLinks(
  node: HTMLElement,
  options: {
    onLinkClick?: LinkClickHandler;
    onMentionClick?: LinkClickHandler;
  } = {}
) {
  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.matches("button[data-href]")) {
      const href = target.getAttribute("data-href");
      if (href) {
        event.preventDefault();
        if (options.onLinkClick) {
          options.onLinkClick(href);
        } else {
          window.open(href, "_blank");
        }
      }
    }

    if (target.matches("button.mention")) {
      const mentionId = target.getAttribute("id");
      if (mentionId) {
        event.preventDefault();
        if (options.onMentionClick) {
          options.onMentionClick(mentionId);
        } else {
          window.open(`?pop=${mentionId}`);
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
