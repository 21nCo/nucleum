import { navigation } from "@nucleum/shell/navigation/navigation";
import { get } from "svelte/store";

import { goto } from "$app/navigation";

import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

import context from "@nucleum/client/runtime/context.store";

import { logger } from "@nucleum/client/runtime/logging/logger";

function handleCustomNavigation(event: any) {
  logger.log({
    at: "handleCustomNavigation",
    event,
    path: event.detail?.path
  });
  logger.info({
    at: "BaseLayer.handleCustomNavigation",
    path: event.detail?.path,
    isReload: event.detail?.isReload,
    replaceState: event.detail?.replaceState,
    currentPath: window.location.pathname,
    protocol: window.location.protocol,
    isEmbed: get(context).isEmbed
  });
  if (event.detail?.isReload) {
    if (!get(context).isEmbed) window.location.reload();
    else {
      goto(
        (import.meta.env?.VITE_CUSTOM_PROTOCOL ?? "tauri") +
          "://localhost/index.html"
      );
    }
  }
  const host = window.location.host;
  if (
    event.detail.path &&
    ((event.detail.path.includes("http") &&
      event.detail.path.includes(host) &&
      !event.detail.path.includes("/oauth/")) ||
      !event.detail.path.includes("http")) &&
    !event.detail.path.includes("mailto:") &&
    !event.detail.path.includes("//oauthsignin")
  ) {
    goto(event.detail.path, {
      replaceState: event.detail?.replaceState ?? false
    });
  } else if (event.detail.path) window.location = event.detail.path;
}

function handleToggleSearchParam(event: any) {
  navigation.toggleSearchParam(event.detail);
}

function handlePlaceholderClick(event: Event) {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "PLACEHOLDER" && target.dataset?.href) {
    navigation.openLink(target.dataset.href);
  }
}
/** Installs browser navigation event handlers and returns their disposer. */
export function installBrowserNavigation() {
  window.addEventListener(
    GlobalEvent.CUSTOM_NAVIGATION,
    handleCustomNavigation
  );
  window.addEventListener(
    GlobalEvent.TOGGLE_SEARCH_PARAM,
    handleToggleSearchParam
  );
  window.addEventListener("click", handlePlaceholderClick);
  const handlePopState = () =>
    navigation.setCurrentPath(document.location.pathname);
  window.addEventListener("popstate", handlePopState);
  return () => {
    window.removeEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.removeEventListener(
      GlobalEvent.TOGGLE_SEARCH_PARAM,
      handleToggleSearchParam
    );
    window.removeEventListener("click", handlePlaceholderClick);
    window.removeEventListener("popstate", handlePopState);
  };
}
