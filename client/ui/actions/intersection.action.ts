type IntersectionOptions = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  callback?: (entry: IntersectionObserverEntry) => void;
  /** Called when the node stops intersecting. */
  onLeave?: (entry: IntersectionObserverEntry) => void;
};

export function intersection(node: Element, options: IntersectionOptions = {}) {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    callback,
    onLeave
  } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) callback?.(entry);
      else onLeave?.(entry);
    },
    { root, rootMargin, threshold }
  );

  observer.observe(node);

  return {
    destroy() {
      observer.unobserve(node);
      observer.disconnect();
    }
  };
}
