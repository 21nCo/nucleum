/**
 * TODO - test the reliability of this function
 * @returns true if the current environment is an extension environment
 */
export function isExtensionEnvironment() {
  if (typeof chrome !== "undefined" && chrome?.runtime?.id) {
    return true;
  }

  if (
    typeof window !== "undefined" &&
    typeof (window as any)?.browser !== "undefined" &&
    (window as any).browser.runtime?.id
  ) {
    return true;
  }

  if (
    typeof window !== "undefined" &&
    typeof (window as any)?.__plasmo !== "undefined"
  ) {
    return true;
  }

  if (
    typeof window !== "undefined" &&
    (window.location.protocol === "chrome-extension:" ||
      window.location.protocol === "moz-extension:")
  ) {
    return true;
  }

  return false;
}

export function isContentScript(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.location.protocol !== "chrome-extension:"
    );
  } catch {
    return false;
  }
}
