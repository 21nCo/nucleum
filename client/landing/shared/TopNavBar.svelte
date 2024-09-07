<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { goto } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import type { ITopNavBar } from "./Landing.types";
  import LightDarkModeToggle from "./LightDarkModeToggle.svelte";
  import Button from "./elements/Button.svelte";
  import { isProductsPanelOpen } from "./store/shared.store";

  export let topNavBarValues: ITopNavBar;
  export let isProductsPage = true;
  export let isExpandHamMenu: boolean = true;
  let icon = "ham-burger-menu";

  function setIcon() {
    if (isExpandHamMenu) {
      icon = "close";
    } else {
      icon = "ham-burger-menu";
    }
  }
  function onHam() {
    isExpandHamMenu = !isExpandHamMenu;
    setIcon();
  }

  onMount(() => {
    setIcon();
    console.log(window.location.href);
  });
</script>

<div class="flex w-full items-center justify-center sticky top-0 z-50 bg-bgs1">
  <div class="w-[1440px] mo:w-full">
    <div class="w-full flex pt-7 pr-5 pl-10 h-16 mo:h-20">
      <div class="flex flex-col">
        <div class="flex items-end">
          {#if topNavBarValues.icon}
            {@const icon = topNavBarValues.icon}
            {@const size = $view.isPortrait
              ? isProductsPage
                ? Size.lg
                : Size.xxl
              : isProductsPage
                ? Size.xl
                : "5xl"}
            {@const className = isProductsPage
              ? ""
              : $view.isPortrait
                ? "relative top-2.5"
                : ""}
            <SvgIcon {icon} {size} class={className} />
          {/if}
          <div class="flex flex-col">
            {#if $view.isPortrait}
              <p
                class={cn(
                  "text-[11px] font-medium leading-4 text-fgs3",
                  isProductsPage && "visible",
                  !isProductsPage && "invisible"
                )}
              >
                Blank.coop
              </p>
            {/if}
            {#if topNavBarValues.title}
              {@const title = topNavBarValues.title}
              <p
                class={cn(
                  "font-extrabold leading-7 mo:leading-5",
                  isProductsPage && "text-h2 mo:text-h4",
                  !isProductsPage && "text-h1 mo:text-h3"
                )}
              >
                {title}
              </p>
            {/if}
          </div>
        </div>
      </div>
      <div class="ml-auto inline-flex dp:gap-8 tp:gap-4 mo:gap-6">
        {#if !$view.isPortrait}
          <LightDarkModeToggle />
        {/if}
        <SvgIcon
          {icon}
          size={Size.lg}
          class="hidden mo:block mt-5"
          on:click={onHam}
        />
        <div
          class={cn(
            "flex dp:gap-8 tp:gap-2",
            !isExpandHamMenu && "mo:hidden",
            isExpandHamMenu &&
              "mo:flex mo:flex-col mo:fixed mo:w-screen mo:h-full bg-bgs1 left-0 top-20 mo:items-center mo:py-14 mo:gap-7"
          )}
        >
          {#each topNavBarValues.items as item}
            <a
              class={cn(
                "block text-fgs1 text-[20px] font-medium leading-[28px] hover:text-aps1",
                topNavBarValues.items.length > 1 && "tp:text-[16px]",
                isExpandHamMenu && "mo:text-[20px]"
              )}
              href={item.href}>{item.label}</a
            >
          {/each}
          {#if topNavBarValues.cta}
            {@const className = "-mt-3 mo:text-[20px] tp:text-[16px] w-fit"}
            <Button
              label={topNavBarValues.cta.label}
              class={className}
              on:click={() => goto(topNavBarValues?.cta?.href ?? "")}
            />
          {/if}

          <p
            class="hidden mo:block text-h4 leading-9 font-normal underline underline-offset-4 mt-9"
            on:click={() => ($isProductsPanelOpen = true)}
            on:keypress
          >
            Explore more Blank.coop products
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
