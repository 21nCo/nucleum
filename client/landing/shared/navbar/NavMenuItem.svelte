<script lang="ts">
  import type { ITopNavBarItem } from "../landing.type";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { page } from "$app/stores";
  export let item: ITopNavBarItem;
  export let isStickedContext: boolean = false;
  $: isActive = $page.url.pathname.includes(item.href.toLowerCase());
</script>

<a
  class={cn(
    "flex items-center gap-1 text-b2 2k:text-lb2 px-3 py-1 rounded-full",
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
  href={item.href}
  >{item.label}
  {#if item.expandRender}
    <span class="w-3">
      <SvgIcon icon="chevdown" isRenderRaw={true} />
    </span>
  {/if}
</a>
