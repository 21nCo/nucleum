<script lang="ts">
  import {
    CurationType,
    type CurationThumbnail
  } from "$lib/client/products/memotron/curation/curation.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let curation: CurationThumbnail;
  $: isNew =
    curation.createdAt &&
    new Date(curation.createdAt) >
      new Date(new Date().setDate(new Date().getDate() - 7));
</script>

<button
  class="flex justify-between items-center w-full p-2 rounded-md hover:bg-bgs2"
  id={curation.id}
  on:click
>
  <span class="flex gap-2">
    {#if isValidArrayWithData(curation.children)}
      <!-- Tree open -->
      <Icon icon="chevright" size={Size.sm} />
    {:else if curation.type === CurationType.COLLECTION}
      <Icon icon="rectangle-stack" size={Size.sm} />
    {:else}
      <Icon icon="rectangle-group" size={Size.sm} />
    {/if}
    <span class="">{curation.label}</span>
    {#if isNew}
      <Icon icon="sparkles" size={Size.xs} />
    {/if}
  </span>
  {#if curation.type === CurationType.COLLECTION && curation.itemCount}
    <span class="text-b4 text-fgs3">{curation.itemCount} items</span>
  {/if}
</button>
