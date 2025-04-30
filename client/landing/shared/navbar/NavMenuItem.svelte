<script lang="ts">
  import type { ITopNavBarItem } from "../landing.type";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  export let item: ITopNavBarItem;
</script>

<button
  class="flex items-center gap-1 text-fgs1 text-b2 2k:text-lb2 hover:text-aps1 hover:bg-bgs2 px-3 py-1 rounded-full"
  on:click
  >{item.label}
  {#if item.expandRender}
    <SvgIcon icon="chevdown" isRenderRaw={true} />
  {/if}
</button>
