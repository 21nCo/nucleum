<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "../landing.type";
  import { isProductPage, isProductsPanelOpen } from "../store/shared.store";
  import DayAndNightToggle from "../DayAndNightToggle.svelte";
  import ButtonAsLink from "../ButtonAsLink.svelte";
  import StickyPart from "./StickyPart.svelte";
  import { onMount } from "svelte";
  import NavMenu from "./NavMenu.svelte";
  import NavBarCta from "./NavBarCta.svelte";
  import NavBarLogo from "./NavBarLogo.svelte";
  export let topNavBarValues: ITopNavBar;
  export let scrollY: number = 0;
  export let isPreventSticky: boolean = false;
  let isExpandHamMenu: boolean = false;
  const id: string = "top-ham-menu";
  let icon = "ham-burger-menu";
  let isStickied: boolean = false;
  $: isStickied = scrollY > 20;

  async function onHamClick() {
    // await addAnimateClass("animate-slide-up", id);
    isExpandHamMenu = !isExpandHamMenu;
    setIcon();
  }

  function setIcon() {
    if (isExpandHamMenu) {
      icon = "close";
    } else {
      icon = "ham-burger-menu";
    }
  }

  onMount(() => {
    setIcon();
    // Initialize isStickied based on initial scroll position
    if (typeof window !== "undefined") {
      isStickied = window.scrollY > 50;
    }
  });
</script>

<div class="relative">
  <div
    class={cn(
      "flex w-full items-center justify-center bg-bgs2 mo:pt-3 mo:pb-2 lp:border-b border-brs3 py-3"
    )}
  >
    <div class="w-[1440px] mo:w-full">
      <div class="w-full flex items-center justify-between px-5 h-12">
        <NavBarLogo {topNavBarValues} />
        {#if !$view.isPortrait}
          <NavBarCta cta={topNavBarValues.cta} />
        {:else}
          {#if !$view.isPortrait && $isProductPage}
            <DayAndNightToggle />
          {/if}
          <SvgIcon {icon} size={Size.lg} on:click={onHamClick} />
        {/if}
      </div>
    </div>
  </div>
  {#if $view.isPortrait && isExpandHamMenu}
    <div
      {id}
      class="animate-slide-down mo:flex mo:flex-col mo:fixed mo:w-screen mo:h-full bg-bgs1 left-0 top-20 mo:items-center mo:py-14 mo:gap-7 flex-shrink mo:flex-grow z-50"
    >
      <NavMenu {topNavBarValues} />
      <ButtonAsLink
        class="hidden mo:block"
        label="Explore more 21n products"
        on:click={() => ($isProductsPanelOpen = true)}
      />
      {#if $view.isPortrait}
        <DayAndNightToggle class="hidden mo:block mt-auto mb-10" />
      {/if}
    </div>
  {:else if !$view.isPortrait}
    <StickyPart
      {topNavBarValues}
      {isStickied}
      isShowCta={scrollY > 70}
      {isPreventSticky}
    />
  {/if}
</div>
