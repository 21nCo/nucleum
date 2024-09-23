import { logger } from "../components/debug/logger.client";

/**
 * Lazy loads an image when it is in the viewport.
 * @param image
 * @param src
 * @returns
 */
export function lazyLoad(image, src) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        image.src = src;
        observer.unobserve(image);
      }
    });
  });

  observer.observe(image);

  return {
    destroy() {
      observer.unobserve(image);
    }
  };
}

export function fileLoader(
  node: HTMLElement,
  params: {
    source: string | (() => Promise<string>);
    isLazyLoad?: boolean;
  }
) {
  let observer: IntersectionObserver;
  let source = params.source;
  let isLazyLoad = params.isLazyLoad ?? true;

  setupLazyLoad();

  return {
    update(newParams: {
      source: string | (() => Promise<string>);
      isLazyLoad?: boolean;
    }) {
      source = newParams.source;
      isLazyLoad = newParams.isLazyLoad ?? true;

      if (observer) {
        observer.unobserve(node);
      }

      setupLazyLoad();
    },
    destroy() {
      if (observer) {
        observer.unobserve(node);
      }
    }
  };

  async function setupLazyLoad() {
    if (!isLazyLoad) {
      await loadSource();
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadSource().then(() => {
            observer.unobserve(node);
          });
        }
      });
    });

    observer.observe(node);
  }

  async function loadSource() {
    try {
      if (node instanceof HTMLImageElement) {
        //TODO - placeholder until loading...
        //slateblue
        node.src = "https://placehold.co/60x40/darkgrey/darkgrey?text=...";
      }
      const sourceValue =
        typeof source === "function" ? await source() : source;

      if (node instanceof HTMLImageElement) {
        node.src = sourceValue;
      } else if (
        node instanceof HTMLAudioElement ||
        node instanceof HTMLVideoElement
      ) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
        const sourceElement = document.createElement("source");
        sourceElement.src = sourceValue;
        node.appendChild(sourceElement);
        node.load();
      }
    } catch (e) {
      logger.error({ at: "fileLoader.svelte - loadSource", error: e });
    }
  }
}

export function fileLoaderv2(
  node: HTMLElement,
  params: {
    source: string | (() => Promise<string>);
    isLazyLoad?: boolean;
    id?: string | number;
  }
) {
  let observer: IntersectionObserver;
  let source = params.source;
  let isLazyLoad = params.isLazyLoad ?? true;
  let currentId = params.id;

  async function loadSource() {
    try {
      if (node instanceof HTMLImageElement) {
        node.src = "https://placehold.co/60x40/darkgrey/darkgrey?text=...";
      }
      const sourceValue =
        typeof source === "function" ? await source() : source;

      if (node instanceof HTMLImageElement) {
        node.src = sourceValue;
      } else if (
        node instanceof HTMLAudioElement ||
        node instanceof HTMLVideoElement
      ) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
        const sourceElement = document.createElement("source");
        sourceElement.src = sourceValue;
        node.appendChild(sourceElement);
        node.load();
      }
    } catch (e) {
      console.error("Error in fileLoader - loadSource:", e);
    }
  }

  function setupLazyLoad() {
    if (!isLazyLoad) {
      loadSource();
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadSource().then(() => {
            observer.unobserve(node);
          });
        }
      });
    });

    observer.observe(node);
  }

  setupLazyLoad();

  return {
    update(newParams: {
      source: string | (() => Promise<string>);
      isLazyLoad?: boolean;
      id?: string | number;
    }) {
      source = newParams.source;
      isLazyLoad = newParams.isLazyLoad ?? true;

      if (newParams.id !== currentId) {
        currentId = newParams.id;
        if (observer) {
          observer.unobserve(node);
        }
        setupLazyLoad();
      }
    },
    destroy() {
      if (observer) {
        observer.unobserve(node);
      }
    }
  };
}
