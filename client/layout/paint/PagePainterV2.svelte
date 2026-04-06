<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import type { IAction } from "@21n/types/action.type";
  import { onDestroy, onMount } from "svelte";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import { resolveProductConfig } from "@21n/products/product.config";
  import view from "@21n/stores/view.store";

  let {
    prefix = undefined,
    cmdPageLaunch = undefined
  }: {
    prefix?: string;
    cmdPageLaunch?: string;
  } = $props();

  let action = $state<IAction | null>(null);
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
