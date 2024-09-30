<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

  export let id: IRecordId;
  export let parentBgIndex: number = 1;
  let item: any;

  function resolveItem() {
    const resource = determineResourceType(id);
    if (resource === Resource.collection) {
      return flux.select(id, ["*", "typeToExtend.* as typeToExtend"]);
    } else {
      return flux.select(id);
    }
  }
  onMount(async () => {
    item = await resolveItem();
  });

  function resovleIcon() {
    if (item.avatar) {
      return item.avatar;
    } else if (item.typeToExtend?.avatar) {
      return item.typeToExtend.avatar;
    }
    return undefined;
  }
</script>

{#if item?.label}
  <Tag
    {id}
    label={item?.label}
    {parentBgIndex}
    icon={resovleIcon()}
    on:click
    on:remove
  />
{/if}
