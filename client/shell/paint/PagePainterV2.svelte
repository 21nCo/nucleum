<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import type { Page } from "@sveltejs/kit";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import context from "@nucleum/client/runtime/context.store";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { onDestroy, onMount, untrack } from "svelte";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import view from "@21n/ui/environment/view.store";
  import { navigatorHistory } from "@nucleum/shell/navigator/navigator-history.store";
  import { resolveRecordedPagePath } from "@nucleum/shared-state/commands/page-view-actions";
  import {
    NOT_FOUND_PATH,
    resolveNotFound
  } from "@nucleum/shell/navigation/not-found";

  const ComponentResolver = requireActionRenderer();
  const productConfig = requireProductConfig();

  let {
    prefix = undefined,
    cmdPageLaunch = undefined
  }: {
    prefix?: string;
    cmdPageLaunch?: string;
  } = $props();

  let action = $state<IAction | null>(null);
  let subPath = $state<string[] | undefined>(undefined);
  let isRouted = $state(false);
  let lastRecordedPath: string | undefined;
  const params = $derived(
    subPath
      ? { ...(action?.componentParams ?? {}), subPath, isRouted }
      : action?.componentParams
  );
  let pageSub: any;
  let pendingRefreshes = $state<number[]>([]);
  const fileBasedRoutes = ["cparchived"];
  function resolvePath(pageData?: Page) {
    if (cmdPageLaunch) {
      return cmdPageLaunch;
    }
    if ($context.isSheet) {
      return $appStore.sheetPath;
    }
    let currentPath =
      pageData?.url?.pathname ??
      (typeof window !== "undefined" ? window.location.pathname : "");
    currentPath = currentPath.replace(/^\/+|\/+$/g, "");
    if (prefix) {
      currentPath = prefix + "/" + currentPath;
    }
    return currentPath?.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
  }

  function queueRefresh() {
    [0, 50, 200].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        refresh();
        pendingRefreshes = pendingRefreshes.filter((id) => id !== timeoutId);
      }, delay);
      pendingRefreshes = [...pendingRefreshes, timeoutId];
    });
  }

  afterNavigate(() => {
    queueRefresh();
  });

  $effect(() => {
    if ($appStore.actions.length > 0 && !action) untrack(() => queueRefresh());
  });

  onMount(() => {
    const refreshFromWindow = () => {
      queueRefresh();
    };
    pageSub = page.subscribe(async (pageData) => {
      await refresh(pageData);
    });
    window.addEventListener("popstate", refreshFromWindow);
    window.addEventListener(GlobalEvent.CUSTOM_NAVIGATION, refreshFromWindow);
    queueRefresh();
    return () => {
      pageSub?.();
      window.removeEventListener("popstate", refreshFromWindow);
      window.removeEventListener(
        GlobalEvent.CUSTOM_NAVIGATION,
        refreshFromWindow
      );
      pendingRefreshes.forEach((id) => window.clearTimeout(id));
      pendingRefreshes = [];
    };
  });
  onDestroy(() => {
    pageSub?.();
  });
  async function refresh(pageData?: Page) {
    const path = resolvePath(pageData);
    if (
      fileBasedRoutes.some((x) => window.location.pathname.startsWith("/" + x))
    ) {
      return;
    }
    if (path === "" || path === "index.html") {
      const homePath = $view.isPortrait
        ? productConfig.homePathPt
        : productConfig.homePath;
      navigation.gotoPath(homePath + window.location.search);
      return;
    }
    if ($appStore.actions.length === 0) return;

    const route = path ? appStore.resolvePageRoute(path) : null;
    action = route?.action ?? null;

    if (!action) {
      subPath = undefined;
      lastRecordedPath = undefined;
      const notFound = resolveNotFound(path, {
        isUrlPath: !cmdPageLaunch && !$context.isSheet,
        currentUrl: pageData?.url ?? new URL(window.location.href)
      });
      if (notFound.kind === "redirect") {
        navigation.gotoPath(notFound.url);
        return;
      }
      action = appStore.resolveComponentFromPath(NOT_FOUND_PATH);
      if (!action) return;
    }
    const isRoutedPage = !cmdPageLaunch && !$context.isSheet;
    const nextSubPath = route?.subPath;
    isRouted = isRoutedPage;
    if (nextSubPath?.join("/") !== subPath?.join("/")) subPath = nextSubPath;
    $appStore.currentComponent = action;
    $appStore.isMenuHidden = action.isMenuHidden || $context.isSheet;
    if (!$context.isSheet) recordPageVisit(action, nextSubPath);
  }

  function recordPageVisit(
    pageAction: IAction,
    pageSubPath: string[] | undefined
  ) {
    const recordedPath = resolveRecordedPagePath(
      $appStore.actions,
      pageAction,
      pageSubPath,
      isRouted
    );
    if (!recordedPath) {
      lastRecordedPath = undefined;
      return;
    }
    if (recordedPath === lastRecordedPath) return;
    lastRecordedPath = recordedPath;
    navigatorHistory.recordPage(recordedPath);
  }
</script>

{#if action}
  <ComponentResolver path={action.path ?? action.action} {params} />
{/if}
