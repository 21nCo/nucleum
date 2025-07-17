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
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  let id: string = "main";
  let centralContainerRef: HTMLDivElement;
  export let topNavBarValues: ITopNavBar;
  export let isComingSoon: boolean = false;
  export let isProduct: boolean = false;
  export let footerValues: IFooter;
  export let metadata: IMetadata;
  let scrollY: number = 0;
  let isShowLoadingOverlay: boolean = false;
  let transformedProducts: IListItem[] = [
    { title: "Our products" },
    ...$currentProductsStore?.map((product) => ({
      title: product.title,
      href: product.href || "/"
    }))
  ];

  $: isShowGrid = !isComparePage && scrollY < 70;
  $: isComparePage =
    typeof window !== "undefined" &&
    window.location.pathname.includes("compare");

  function addEntryAnimation(id: string) {
    if (isProduct) addAnimateClass("animate-open-left", id);
    else addAnimateClass("animate-open-right", id);
  }

  onMount(async () => {
    isProductPage.set(isProduct);
    if (typeof window !== "undefined") {
      view?.refresh(window.innerWidth, window.innerHeight);
    }
    setTimeout(() => {
      isShowLoadingOverlay = false;
    }, 500);
    // if (window.location.pathname === "/" || window.location.pathname === "")
    //   addEntryAnimation(id);
  });
  const windowResizeListener = (event: Event) => {
    if (typeof window !== "undefined") {
      view.refresh(window.innerWidth, window.innerHeight);
    }
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

<LandingBaseLayer {metadata} bgColor={"bg-bgs2"}>
  <!-- {#if import.meta.env.DEV}
  <div class="fixed bottom-0 right-0 bg-bgs1 text-fgs1 p-2 text-xs z-50">
    Theme: {$appearance.theme}<br />
    Color Scheme: {$appearance.colorScheme?.id}<br />
    Tailwind Selector: {$appearance.colorScheme?.tailwindSelector}
  </div>
{/if} -->

  {#if isShowLoadingOverlay}
    <div
      class="bg-bgs2 fixed w-screen h-screen z-[100] flex justify-center items-center"
    >
      <SvgIcon icon={topNavBarValues.icon} isRenderRaw={true} />
    </div>
  {/if}
  {#if isShowGrid}
    <LeftPanel {isProduct} />
  {/if}
  <div
    {id}
    class="flex flex-col w-full h-full overflow-y-auto"
    bind:this={centralContainerRef}
    on:scroll={handleScroll}
  >
    <TopNavBar {topNavBarValues} {scrollY} isPreventSticky={isComparePage} />
    <div class="flex w-full justify-center flex-1 min-h-0">
      <div
        class={cn("w-full flex flex-col", {
          "max-w-[1240px] mo:min-w-[320px] gap-40 px-8": !isComparePage,
          "flex-1 min-h-0": isComparePage
        })}
      >
        <slot />
        {#if !isComingSoon && !isComparePage}
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
