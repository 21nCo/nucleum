import { navigation } from "@nucleum/shell/navigation/navigation";

import {
  OperatingSystem,
  type IAppContext
} from "@nucleum/client/runtime/context.type";

import view from "@21n/ui/environment/view.store";

/** Owns browser platform classes and viewport-driven shell navigation for one application mount. */
export function createBrowserLayout() {
  let lastOrientation: "portrait" | "landscape" | null = null;
  let orientationTimer: ReturnType<typeof setTimeout> | undefined;
  function initUserAgentClasses(ctx: IAppContext) {
    const userAgent = navigator.userAgent;
    const html = document.documentElement;

    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      html.classList.add("browser-safari");
    }
    if (userAgent.includes("Chrome")) html.classList.add("browser-chrome");
    if (userAgent.includes("Firefox")) html.classList.add("browser-firefox");
    if (ctx.os === OperatingSystem.IOS) html.classList.add("os-ios");
    else if (ctx.os === OperatingSystem.ANDROID)
      html.classList.add("os-android");
    else if (ctx.os === OperatingSystem.MACOS) html.classList.add("os-macos");
    else if (ctx.os === OperatingSystem.WINDOWS)
      html.classList.add("os-windows");
    else if (ctx.os === OperatingSystem.LINUX) html.classList.add("os-linux");

    if (userAgent.includes("embed")) {
      html.classList.add("embed");
      if (userAgent.includes("handset")) html.classList.add("embed-handset");
      if (userAgent.includes("tablet")) html.classList.add("embed-tablet");
    }
  }

  function updateOrientationClasses(): boolean {
    const html = document.documentElement;
    const isPortrait = window.innerHeight > window.innerWidth;
    const currentOrientation = isPortrait ? "portrait" : "landscape";

    const hasOrientationChanged =
      lastOrientation !== null && lastOrientation !== currentOrientation;
    lastOrientation = currentOrientation;

    html.classList.remove("device-portrait", "device-landscape");

    if (isPortrait) {
      html.classList.add("device-portrait");
    } else {
      html.classList.add("device-landscape");
    }

    return hasOrientationChanged;
  }

  function handleViewportChange() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const hasKeyboard = window.innerHeight > viewport.height;
    if (hasKeyboard) {
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${viewport.height}px`
      );
    } else {
      document.documentElement.style.removeProperty("--viewport-height");
    }
  }
  function resize() {
    view.refresh(window.innerWidth, window.innerHeight);
    if (updateOrientationClasses()) navigation.gotoPath("/");
  }
  function orientationChange() {
    orientationTimer = setTimeout(() => {
      view.refresh(window.innerWidth, window.innerHeight);
      updateOrientationClasses();
      navigation.gotoPath("/");
    }, 100);
  }
  return {
    initialize(ctx: IAppContext) {
      initUserAgentClasses(ctx);
      updateOrientationClasses();
    },
    install() {
      window.addEventListener("resize", resize);
      window.visualViewport?.addEventListener("resize", handleViewportChange);
      window.visualViewport?.addEventListener("scroll", handleViewportChange);
      screen.orientation?.addEventListener("change", orientationChange);
      return () => {
        clearTimeout(orientationTimer);
        window.removeEventListener("resize", resize);
        window.visualViewport?.removeEventListener(
          "resize",
          handleViewportChange
        );
        window.visualViewport?.removeEventListener(
          "scroll",
          handleViewportChange
        );
        screen.orientation?.removeEventListener("change", orientationChange);
      };
    }
  };
}
