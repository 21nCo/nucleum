<script lang="ts">
  import { page } from "$app/stores";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { onDestroy, onMount } from "svelte";
  import ComponentResolver from "./ComponentResolver.svelte";
  import { resolveProductConfig } from "$lib/client/products/product.config";
  import view from "$lib/client/stores/view.store";
  export let prefix: string | undefined = undefined;
  export let cmdPageLaunch: string | undefined = undefined;

  let action: IAction | null = null;
  let pageSub: any;
  const fileBasedRoutes = ["cparchived"];
  const productConfig = resolveProductConfig();
  function resolvePath() {
    if (cmdPageLaunch) {
      return cmdPageLaunch;
    }
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
      const homePath = $view.isPortrait
        ? productConfig.homePathPt
        : productConfig.homePath;
      appStore.gotoPath(homePath);
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
