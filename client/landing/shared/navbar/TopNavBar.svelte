<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type { ITopNavBar } from "@21n/landing/shared/landing.type";
  import { isProductPage, isProductsPanelOpen } from "@21n/landing/shared/store/shared.store";
  import DayAndNightToggle from "@21n/landing/shared/DayAndNightToggle.svelte";
  import ButtonAsLink from "@21n/landing/shared/ButtonAsLink.svelte";
  import StickyPart from "@21n/landing/shared/navbar/StickyPart.svelte";
  import { onMount } from "svelte";
  import NavMenu from "@21n/landing/shared/navbar/NavMenu.svelte";
  import NavBarCta from "@21n/landing/shared/navbar/NavBarCta.svelte";
  import NavBarLogo from "@21n/landing/shared/navbar/NavBarLogo.svelte";
  let {
    topNavBarValues,
    scrollY = 0,
    isPreventSticky = false,
  }: {
    topNavBarValues: ITopNavBar;
    scrollY?: number;
    isPreventSticky?: boolean;
  } = $props();

  let isExpandHamMenu: boolean = false;
  const id: string = "top-ham-menu";
  let icon = "ham-burger-menu";
  let initialScrollY = $state(0);
  const isStickied = $derived(Math.max(scrollY, initialScrollY) > 20);

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
    if (typeof window !== "undefined") {
      initialScrollY = window.scrollY;
    }
  });
</script>

<header class="relative">
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
          <SvgIcon {icon} size={Size.lg} onclick={onHamClick} />
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
        onclick={() => ($isProductsPanelOpen = true)}
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
</header>
