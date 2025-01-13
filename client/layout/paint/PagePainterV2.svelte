<script lang="ts">
  import { page } from "$app/stores";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { onDestroy, onMount } from "svelte";
  import ComponentResolver from "./ComponentResolver.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let prefix: string | undefined = undefined;
  let action: IAction | null = null;
  let pageSub: any;
  const fileBasedRoutes = ["cparchived"];
  function resolvePath() {
    if ($context.isSheet) {
      return $appStore.sheetPath;
    }
    let currentPath = $page?.params?.route;
    if (prefix) {
      currentPath = prefix + "/" + currentPath;
    }
    return currentPath?.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
  }
  onMount(async () => {
    pageSub = page.subscribe(async () => {
      await refresh();
    });
  });
  onDestroy(() => {
    pageSub();
  });
  async function refresh() {
    const path = resolvePath();
    if (
      fileBasedRoutes.some((x) => window.location.pathname.startsWith("/" + x))
    ) {
      return;
    }
    if (path === "" || path === "index.html") {
      appStore.gotoPath($appStore.appData.homePath ?? "/home");
      return;
    } else if (!path) {
      appStore.gotoPath("/404");
      return;
    }

    action = appStore.resolveComponentFromPath(path);

    if (!action) {
      if (path === "index.html") appStore.gotoPath("/");
      else appStore.gotoPath("/404", { queryParams: { path } });
      return;
    }
    $appStore.currentComponent = action;
    $appStore.isMenuHidden = action.isMenuHidden || $context.isSheet;
  }
</script>

{#if action}
  <ComponentResolver {action} params={action.componentParams} />
{/if}
