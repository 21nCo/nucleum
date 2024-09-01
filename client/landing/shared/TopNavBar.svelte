<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { goto } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "./Landing.types";
  import LightDarkModeToggle from "./LightDarkModeToggle.svelte";
  import Button from "./elements/Button.svelte";
  import { isProductsPanelOpen } from "./store/shared.store";

  export let topNavBarValues: ITopNavBar;
  export let isExpandHamMenu: boolean = true;
  let icon = "ham-burger-menu";
  function onHam() {
    isExpandHamMenu = !isExpandHamMenu;
    if (isExpandHamMenu) {
      icon = "close";
    } else {
      icon = "ham-burger-menu";
    }
  }
</script>

<div
  class="flex w-full items-center justify-center sticky top-0 z-50 bg-bgs1 border border-rose-500"
>
  <div class="w-[1440px] mo:w-full border">
    <div class="w-full flex pt-7 pr-5 pl-10 h-16">
      {#if topNavBarValues.icon}
        {@const icon = topNavBarValues.icon}
        {@const size = $view.isPortrait ? Size.xxl : "5xl"}
        {@const classNames = $view.isPortrait ? "-mt-2.5" : "-mt-4"}
        <SvgIcon {icon} {size} class={classNames} />
      {/if}
      {#if topNavBarValues.title}
        {@const title = topNavBarValues.title}
        <p class="font-extrabold text-h2 leading-9 mo:text-h4 mo:leading-5">
          {title}
        </p>
      {/if}
      <div class="ml-auto inline-flex dp:gap-8 tp:gap-4 mo:gap-6">
        <LightDarkModeToggle />
        <SvgIcon
          {icon}
          size={Size.xl}
          class="hidden mo:block"
          on:click={onHam}
        />
        <div
          class={cn(
            "flex dp:gap-8 tp:gap-2",
            !isExpandHamMenu && "mo:hidden",
            isExpandHamMenu &&
              "mo:flex mo:flex-col fixed w-screen h-full bg-bgs1 left-0 top-16 items-center py-14 gap-7"
          )}
        >
          {#each topNavBarValues.items as item}
            <a
              class={cn(
                "block text-fgs1 text-[20px] font-medium leading-[28px] hover:text-aps1",
                topNavBarValues.items.length > 1 &&
                  !isExpandHamMenu &&
                  "text-[16px]"
              )}
              href={item.href}>{item.label}</a
            >
          {/each}
          {#if topNavBarValues.cta}
            {@const className = isExpandHamMenu
              ? "-mt-3 text-[18px] w-fit"
              : "-mt-3 text-[16px] w-fit"}
            <Button
              label={topNavBarValues.cta.label}
              class={className}
              on:click={() => goto(topNavBarValues?.cta?.href ?? "")}
            />
          {/if}
          <p
            class="text-h4 leading-9 font-normal underline underline-offset-4 mt-9"
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
