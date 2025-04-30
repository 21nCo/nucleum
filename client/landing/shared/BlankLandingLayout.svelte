<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./navbar/TopNavBar.svelte";
  import { addAnimateClass, cn } from "$lib/client/utils/ui.utils";
  import type { IFooter, IListItem, ITopNavBar } from "./landing.type";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { currentProductsStore, isProductPage } from "./store/shared.store";
  import Footer from "./footer/Footer.svelte";
  import { afterNavigate } from "$app/navigation";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
  let id: string = "main";
  let centralContainerRef: HTMLDivElement;
  export let topNavBarValues: ITopNavBar;
  export let isComingSoon: boolean = false;
  export let isProduct: boolean = false;
  export let footerValues: IFooter;
  export let metadata: IMetadata;
  let scrollY: number = 0;
  let transformedProducts: IListItem[] = [
    { title: "Our products" },
    ...$currentProductsStore?.map((product) => ({
      title: product.title,
      href: product.href || "/"
    }))
  ];

  $: isShowGrid = scrollY < 70;

  function addEntryAnimation(id: string) {
    if (isProduct) addAnimateClass("animate-open-left", id);
    else addAnimateClass("animate-open-right", id);
  }
  onMount(async () => {
    isProductPage.set(isProduct);
    view?.refresh(window.innerWidth, window.innerHeight);
    // if (window.location.pathname === "/" || window.location.pathname === "")
    //   addEntryAnimation(id);
  });
  const windowResizeListener = (event: Event) => {
    view.refresh(window.innerWidth, window.innerHeight);
  };

  afterNavigate(() => {
    if (centralContainerRef) {
      setTimeout(() => {
        centralContainerRef.scrollTo(0, 0);
      }, 10);
    }
  });

  function handleScroll(event: Event) {
    // console.log("Scroll detected", { event });
    scrollY = (event.target as HTMLElement).scrollTop;
  }
</script>

<LandingBaseLayer {metadata} bgColor="bg-bgs2">
  {#if isShowGrid}
    <LeftPanel {isProduct} />
  {/if}
  <div
    {id}
    class="w-full overflow-y-auto"
    bind:this={centralContainerRef}
    on:scroll={handleScroll}
  >
    <TopNavBar {topNavBarValues} {scrollY} />
    <div class="flex w-full justify-center">
      <div
        class={cn(
          "w-full max-w-[1240px] mo:min-w-[320px] flex flex-col gap-40 px-8"
        )}
      >
        <slot />
        {#if !isComingSoon}
          <Footer products={transformedProducts} {footerValues} />
        {/if}
      </div>
    </div>
  </div>
  {#if isShowGrid}
    <RightPanel />
  {/if}
</LandingBaseLayer>

<svelte:window on:resize={windowResizeListener} />
