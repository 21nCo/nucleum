<script lang="ts">
  import type { ITopNavBarItem } from "../landing.type";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { page } from "$app/stores";
  export let item: ITopNavBarItem;
  export let isStickedContext: boolean = false;
  export let renderAs: "a" | "button" = "a";

  $: isActive = item.href
    ? $page.url.pathname.includes(item.href.toLowerCase())
    : false;
</script>

<svelte:element
  this={renderAs}
  class={cn(
    "flex items-center gap-1 text-b2 2k:text-lb2 px-3 py-1 rounded-full cursor-pointer",
    {
      "text-aps1 bg-bgs3": isActive && !isStickedContext,
      "text-aps1 bg-bgs2": isActive && isStickedContext,
      "text-fgs1 hover:text-aps1": !isActive,
      "hover:bg-bgs3": !isActive && !isStickedContext,
      "hover:bg-bgs2": !isActive && isStickedContext
    }
  )}
  on:click={() => {
    if (item.callback) {
      item.callback();
    }
  }}
  href={renderAs === "a" ? item.href : undefined}
  role={renderAs === "button" ? "button" : undefined}
  tabindex="0"
  >{item.label}
  {#if item.expandRender}
    <span class="w-3">
      <SvgIcon icon="chevron-down" isRenderRaw={true} />
    </span>
  {/if}
</svelte:element>
