export const safeRequestIdleCallback = (callback: IdleRequestCallback) => {
  if (typeof window.requestIdleCallback !== "undefined") {
    return window.requestIdleCallback(callback);
  } else {
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 0
      });
    }, 1);
  }
};
