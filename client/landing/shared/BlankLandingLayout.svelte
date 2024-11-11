<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./TopNavBar.svelte";
  import { addAnimateClass, cn } from "$lib/client/utils/ui.utils";
  import type { IFooter, IListItem, ITopNavBar } from "./Landing.types";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { currentProductsStore, isProductPage } from "./store/shared.store";
  import Footer from "./footer/Footer.svelte";
  import { afterNavigate } from "$app/navigation";

  let id: string = "centre-panel";
  let centralContainerRef: HTMLDivElement;
  export let topNavBarValues: ITopNavBar;
  export let isComingSoon: boolean = false;
  export let isProduct: boolean = false;
  export let footerValues: IFooter;
  let transformedProducts: IListItem[] = [
    { title: "Products" },
    ...$currentProductsStore?.map((product) => ({
      title: product.title,
      href: product.href || "/"
    }))
  ];

  function addEntryAnimation(id: string) {
    if (isProduct) addAnimateClass("animate-open-left", id);
    else addAnimateClass("animate-open-right", id);
  }
  onMount(async () => {
    isProductPage.set(isProduct);
    view.update(window.innerWidth, window.innerHeight);
    if (window.location.pathname === "/" || window.location.pathname === "")
      addEntryAnimation(id);
  });
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };

  afterNavigate(() => {
    if (centralContainerRef) {
      setTimeout(() => {
        centralContainerRef.scrollTo(0, 0);
      }, 10);
    }
  });
</script>

<LandingBaseLayer>
  <LeftPanel {isProduct} />
  <div {id} class="w-full overflow-y-auto" bind:this={centralContainerRef}>
    <TopNavBar {topNavBarValues} />
    <slot />
    {#if !isComingSoon}
      <Footer products={transformedProducts} {footerValues} />
    {/if}
  </div>
  <RightPanel />
</LandingBaseLayer>

<svelte:window on:resize={windowResizeListener} />
