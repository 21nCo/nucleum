const SCROLL_DEADLINE_MS = 5000;
const STABLE_PASSES = 2;
const POSITION_TOLERANCE_PX = 1;
const USER_SCROLL_EVENTS = ["wheel", "touchmove"] as const;

/**
 * Scrolls a Markdown heading block into view once it renders inside `resolveRoot()`.
 * Pages render their blocks progressively, so the heading is scrolled again whenever
 * content above it moves it, until it stays in place for a few passes, the deadline
 * passes, or the user scrolls. Returns a function that stops retrying.
 */
export function scrollToHeading(
  resolveRoot: () => ParentNode | null | undefined,
  headingId: string
) {
  let isCancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stablePasses = 0;
  let scrolledTop: number | undefined;
  const deadline = Date.now() + SCROLL_DEADLINE_MS;
  const cancel = () => {
    isCancelled = true;
    clearTimeout(timer);
    for (const type of USER_SCROLL_EVENTS)
      window.removeEventListener(type, cancel, true);
  };
  const attempt = () => {
    if (isCancelled) return;
    const element = resolveRoot()?.querySelector(
      `[id="${CSS.escape(headingId)}"]`
    );
    if (element) {
      const top = element.getBoundingClientRect().top;
      if (
        scrolledTop !== undefined &&
        Math.abs(top - scrolledTop) < POSITION_TOLERANCE_PX
      ) {
        stablePasses += 1;
        if (stablePasses >= STABLE_PASSES) return cancel();
      } else {
        stablePasses = 0;
        element.scrollIntoView({ block: "start" });
        scrolledTop = element.getBoundingClientRect().top;
      }
    }
    if (Date.now() < deadline) timer = setTimeout(attempt, element ? 250 : 100);
    else cancel();
  };
  for (const type of USER_SCROLL_EVENTS)
    window.addEventListener(type, cancel, { capture: true, passive: true });
  attempt();
  return cancel;
}
