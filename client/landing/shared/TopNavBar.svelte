<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "./Landing.types";
  import LightDarkModeToggle from "./LightDarkModeToggle.svelte";

  export let topNavBarValues: ITopNavBar;
  export let navBarHeight: number = 66;
</script>

<div class="flex w-full items-center justify-center sticky top-0 z-50 bg-bgs1">
  <div class="w-[1440px]">
    <div class="w-full flex pt-7 pr-5 pl-10" style="height: {navBarHeight}px;">
      {#if topNavBarValues.icon}
        {@const icon = topNavBarValues.icon}
        <SvgIcon {icon} />
      {/if}
      {#if topNavBarValues.title}
        {@const title = topNavBarValues.title}
        <p class="font-extrabold text-h2 leading-9">{title}</p>
      {/if}
      <div class="ml-auto inline-flex gap-8">
        <LightDarkModeToggle />
        {#each topNavBarValues.items as item}
          <a href={item.href}>{item.label}</a>
        {/each}
        {#if topNavBarValues.cta}
          <button>cta button</button>
        {/if}
      </div>
    </div>
  </div>
</div>
