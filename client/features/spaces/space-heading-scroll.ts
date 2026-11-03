const SCROLL_DEADLINE_MS = 5000;
const SETTLED_PASSES = 10;

/**
 * Scrolls a Markdown heading block into view once it renders inside `resolveRoot()`.
 * Pages render their blocks progressively, so the scroll repeats a few times until
 * the layout settles or a deadline passes. Returns a function that stops retrying.
 */
export function scrollToHeading(
  resolveRoot: () => ParentNode | null | undefined,
  headingId: string
) {
  let isCancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settledPasses = 0;
  const deadline = Date.now() + SCROLL_DEADLINE_MS;
  const attempt = () => {
    if (isCancelled) return;
    const element = resolveRoot()?.querySelector(
      `[id="${CSS.escape(headingId)}"]`
    );
    if (element) {
      element.scrollIntoView({ block: "start" });
      settledPasses += 1;
      if (settledPasses >= SETTLED_PASSES) return;
    }
    if (Date.now() < deadline) timer = setTimeout(attempt, element ? 250 : 100);
  };
  attempt();
  return () => {
    isCancelled = true;
    clearTimeout(timer);
  };
}
