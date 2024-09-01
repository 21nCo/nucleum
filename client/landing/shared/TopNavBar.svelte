<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "./Landing.types";
  import LightDarkModeToggle from "./LightDarkModeToggle.svelte";
  import Button from "./elements/Button.svelte";

  export let topNavBarValues: ITopNavBar;
  export let navBarHeight: number = 66;
</script>

<div class="flex w-full items-center justify-center sticky top-0 z-50 bg-bgs1">
  <div class="w-[1440px]">
    <div class="w-full flex pt-7 pr-5 pl-10" style="height: {navBarHeight}px;">
      {#if topNavBarValues.icon}
        {@const icon = topNavBarValues.icon}
        <SvgIcon {icon} size="5xl" class="-mt-3" />
      {/if}
      {#if topNavBarValues.title}
        {@const title = topNavBarValues.title}
        <p class="font-extrabold text-h2 leading-9">{title}</p>
      {/if}
      <div class="ml-auto inline-flex gap-8">
        <LightDarkModeToggle />
        {#each topNavBarValues.items as item}
          <a
            class={cn(
              "block text-fgs1 text-[20px] font-normal leading-[28px] hover:text-aps1",
              topNavBarValues.items.length > 1 && "text-[16px]"
            )}
            href={item.href}>{item.label}</a
          >
        {/each}
        {#if topNavBarValues.cta}
          <Button
            href={topNavBarValues.cta.href}
            label={topNavBarValues.cta.label}
            class="-mt-3 text-[16px]"
          />
        {/if}
      </div>
    </div>
  </div>
</div>
