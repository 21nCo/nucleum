<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./TopNavBar.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IListItem, ITopNavBar } from "./Landing.types";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { currentProductsStore } from "./store/shared.store";
  import Footer from "./footer/Footer.svelte";

  export let isProductsPage = true;
  export let topNavBarValues: ITopNavBar;
  let transformedProducts: IListItem[] = [
    { title: "Products" },
    ...$currentProductsStore?.map((product) => ({
      title: product.title,
      href: product.href || "/"
    }))
  ];

  onMount(async () => {
    view.update(window.innerWidth, window.innerHeight);
  });
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };
</script>

<LandingBaseLayer>
  {#if isProductsPage}
    <LeftPanel />
  {/if}
  <div class="w-full overflow-auto">
    <TopNavBar {topNavBarValues} {isProductsPage} />
    <slot />
    <Footer products={transformedProducts} />
  </div>
  <RightPanel />
</LandingBaseLayer>

<svelte:window on:resize={windowResizeListener} />
