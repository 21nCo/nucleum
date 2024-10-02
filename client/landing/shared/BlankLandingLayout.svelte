<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./TopNavBar.svelte";
  import { addAnimateClass, cn } from "$lib/client/utils/ui.utils";
  import type { IListItem, ITopNavBar } from "./Landing.types";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { currentProductsStore, isProductsPage } from "./store/shared.store";
  import Footer from "./footer/Footer.svelte";
  import { page } from "$app/stores";

  let id: string = "centre-panel";
  export let topNavBarValues: ITopNavBar;
  export let isComingSoon: boolean = false;
  let transformedProducts: IListItem[] = [
    { title: "Products" },
    ...$currentProductsStore?.map((product) => ({
      title: product.title,
      href: product.href || "/"
    }))
  ];

  function addEntryAnimation(id: string) {
    if ($isProductsPage) addAnimateClass("animate-open-left", id);
    else addAnimateClass("animate-open-right", id);
  }
  onMount(async () => {
    view.update(window.innerWidth, window.innerHeight);
    if ($page.url.href.includes("blank")) $isProductsPage = false;
    else $isProductsPage = true;
    addEntryAnimation(id);
  });
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };
</script>

<LandingBaseLayer>
  {#if $isProductsPage}
    <LeftPanel />
  {/if}
  <div {id} class="w-full overflow-auto">
    <TopNavBar {topNavBarValues} />
    <slot />
    {#if !isComingSoon}
      <Footer products={transformedProducts} />
    {/if}
  </div>
  <RightPanel />
</LandingBaseLayer>

<svelte:window on:resize={windowResizeListener} />
