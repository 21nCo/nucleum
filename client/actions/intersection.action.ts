type IntersectionOptions = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  callback?: (entry: IntersectionObserverEntry) => void;
};

export function intersection(node: Element, options: IntersectionOptions = {}) {
  const { root = null, rootMargin = "0px", threshold = 0, callback } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (callback && entry.isIntersecting) {
        callback(entry);
      }
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
