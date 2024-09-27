<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { ICollection } from "../collection.type";
  import { resolveResourceType } from "../../memotron.utils";
  export let item: ICollection;
  const type = resolveResourceType(item);
  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
  // $: console.log({ item });
</script>

<div class="flex justify-between w-full">
  <span class="flex gap-2 grow items-center">
    {#if type === MemotronResourceType.TYPED_COLLECTION && item.avatar}
      <AvatarRenderer avatar={item.avatar} size={Size.sm} />
    {:else if type === MemotronResourceType.QUERY_COLLECTION}
      <Icon icon="at-symbol" size={Size.sm} />
    {/if}
    <span class="text-left w-5/6 truncate text-b2 font--medium">
      {#if item.label}
        {item.label}
      {:else}
        {resolveEmptyLabel()}
      {/if}
    </span>
  </span>
  {#if item.isStarred}
    <Icon icon="star" class="fill-yellow-400" />
  {/if}
</div>
