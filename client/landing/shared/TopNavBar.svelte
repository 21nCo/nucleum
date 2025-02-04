<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { goto } from "$lib/client/utils/browser.utils";
  import { addAnimateClass, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import type { ITopNavBar } from "./Landing.types";
  import Button from "./elements/Button.svelte";
  import { isProductPage, isProductsPanelOpen } from "./store/shared.store";
  import DayAndNightToggle from "./DayAndNightToggle.svelte";
  import ButtonAsLink from "./ButtonAsLink.svelte";

  export let topNavBarValues: ITopNavBar;
  export let isExpandHamMenu: boolean = false;
  let icon = "ham-burger-menu";

  const id: string = "top-ham-menu";
  function setIcon() {
    if (isExpandHamMenu) {
      icon = "close";
    } else {
      icon = "ham-burger-menu";
    }
  }
  async function onHam() {
    await addAnimateClass("animate-slide-up", id);
    isExpandHamMenu = !isExpandHamMenu;
    setIcon();
  }

  onMount(() => {
    setIcon();
  });
</script>

<div
  class={cn(
    "flex w-full items-center justify-center sticky top-0 z-50 box-content bg-bgs1 mo:pt-3 mo:pb-2 lp:border-b border-brs2",
    {
      "pt-7 pb-4": $isProductPage,
      "py-4": !$isProductPage
    }
  )}
>
  <div class="w-[1440px] mo:w-full">
    <div class="w-full flex items-center px-5 h-12">
      <button
        class="flex flex-col justify-end"
        on:click={() => (window.location.href = "/")}
      >
        <div class="flex items-center gap-2">
          {#if topNavBarValues.icon}
            {@const icon = topNavBarValues.icon}
            {@const size = $view.isPortrait
              ? $isProductPage
                ? Size.lg
                : Size.xxl
              : $isProductPage
                ? Size.xxl
                : "5xl"}
            {@const className =
              "mr-2 border " + $isProductPage
                ? ""
                : $view.isPortrait
                  ? "relative top-5"
                  : ""}
            <SvgIcon {icon} {size} class={className} />
          {/if}
          <div class="flex flex-col">
            <!-- {#if $view.isPortrait}
              <button
                class={cn(
                  "text-[11px] font-medium leading-none text-fgs3 w-[54px]",
                  $isProductPage && "visible",
                  !$isProductPage && "invisible"
                )}
                on:click={() =>
                  (window.location.href = "https://blanklabs.org")}
              >
                21n
                <div class="h-px bg-dividerHorizontal mt-[2px]" />
              </button>
            {/if} -->
            {#if topNavBarValues.title}
              {@const title = topNavBarValues.title}
              <p
                class={cn(
                  "font-extrabold leading-10",
                  $isProductPage && "text-h2 mo:text-h4 mo:leading-6",
                  !$isProductPage && "text-h1 mo:text-h3 mo:leading-10"
                )}
              >
                {title}
              </p>
            {/if}
          </div>
        </div>
      </button>
      <div class="ml-auto flex items-center dp:gap-8 tp:gap-4 mo:gap-6">
        {#if !$view.isPortrait && $isProductPage}
          <DayAndNightToggle />
        {/if}
        <SvgIcon
          {icon}
          size={Size.lg}
          class="hidden mo:block"
          on:click={onHam}
        />
        <div
          {id}
          class={cn(
            "flex items-center tp:gap-4 lp:gap-6 dp:gap-8",
            !isExpandHamMenu && "mo:hidden",
            isExpandHamMenu &&
              "animate-slide-down mo:flex mo:flex-col mo:fixed mo:w-screen mo:h-full bg-bgs1 left-0 top-20 mo:items-center mo:py-14 mo:gap-7 flex-shrink mo:flex-grow"
          )}
        >
          {#each topNavBarValues.items as item}
            <a
              class="block text-fgs1 text-[18px] leading-[28px] hover:text-aps1"
              target={item.href.startsWith("http") ? "_blank" : "_self"}
              href={item.href}>{item.label}</a
            >
          {/each}
          {#if topNavBarValues.cta}
            {@const className = "mo:text-[18px] tp:text-[18px] w-fit"}
            <Button
              label={topNavBarValues.cta.label}
              isShort={true}
              class={className}
              on:click={() => {
                window.location.href = topNavBarValues?.cta?.href ?? "";
              }}
            />
          {/if}
          <ButtonAsLink
            class="hidden mo:block"
            label="Explore more 21n products"
            on:click={() => ($isProductsPanelOpen = true)}
          />
          {#if $view.isPortrait}
            <DayAndNightToggle class="hidden mo:block mt-auto mb-10" />
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
