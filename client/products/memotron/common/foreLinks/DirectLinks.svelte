<script lang="ts">
  import type { LinkThumbnail } from "@21n/products/memotron/node/node.type";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import DLinkItem from "@21n/products/memotron/common/foreLinks/DirectLinkItem.svelte";
  export let links: LinkThumbnail[] = [];
  export let context: "capture" | "nodethumbnail" | "nodepage" = "capture";
</script>

{#if isValidArrayWithData(links)}
  <div
    class="flex gap-2 w-full {context === 'capture'
      ? 'flex--wrap overflow-auto'
      : 'overflow-auto'}"
  >
    {#each links as link}
      <DLinkItem {link} {context} on:remove />
    {/each}
  </div>
{/if}
