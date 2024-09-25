<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { NodeThumbnailVariant } from "$lib/client/products/memotron/node/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import NodeItems from "$lib/client/products/memotron/collection/NodeItems.svelte";

  export let subGroup: any;
  export let data: any;
  export let arrangement: NodeThumbnailVariant | undefined;
  export let density: number | undefined;
  export let isInEditMode = false;

  let isCollapsed = data.length > 0 ? false : true;
</script>

<div class="flex flex-col gap-2">
  <button
    class="label flex justify-between gap-2 w-full p-1 rounded-md hover:bg-ccs2"
    on:click={() => {
      isCollapsed = !isCollapsed;
    }}
  >
    <span class="flex gap-2 items-center">
      {subGroup.label}
      <span class="badge text-b3 text-fgs2 bg-ccs2 px-2 rounded-md"
        >{data.length}</span
      >
    </span>
    <Button icon={!isCollapsed ? "chevdown" : "chevup"} size={Size.sm} />
  </button>
  {#if !isCollapsed && !isInEditMode}
    <div class="w-full flex flex-col gap-4">
      <NodeItems nodes={data} {arrangement} {density} />
    </div>
  {/if}
</div>
