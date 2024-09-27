<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Tag from "$lib/client/elements/text/Tag.svelte";

  export let id: IRecordId;
  export let parentBgIndex: number = 1;
  let item: any;

  function resolveItem() {
    return flux.select(id);
  }
  onMount(async () => {
    item = await resolveItem();
  });
</script>

{#if item?.label}
  <Tag
    label={item?.label}
    {parentBgIndex}
    icon={item.avatar ? item.avatar : undefined}
    on:click
    on:remove
  />
{/if}
