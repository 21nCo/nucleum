<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import type { Block } from "$lib/client/types/memotron/md.type";
  import { headingNodeTypes } from "$lib/client/types/memotron/node.type";
  import { createEventDispatcher } from "svelte";
  import type { MdStoreType } from "./markdown.store";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let block: Block;
  export let mdStore: MdStoreType;
</script>

<div class="flex gap-0.5 w-full h-full items-center justify-end">
  {#if $mdStore.params?.isNodular && headingNodeTypes.includes(block.contentType)}
    <button
      class="h-3.5 w-3.5 rounded-full border border-dotted border-fgs4 hover:border-aps1 hover:border-2"
      on:click={() => {
        console.log("focusing", block.id);
        dispatch("focus", { id: block.id });
      }}
    ></button>
  {/if}
  {#if $isInEditMode}
    <button on:click class="hover:bg-bgs3 rounded-md h-full flex items-center">
      <Icon icon="grab" size={Size.lg} />
    </button>
  {/if}
</div>
