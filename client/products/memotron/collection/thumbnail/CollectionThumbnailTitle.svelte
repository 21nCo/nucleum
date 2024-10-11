<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { CollectionType, type ICollectionThumb } from "../collection.type";
  export let item: ICollectionThumb;

  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
</script>

<div class="flex justify-between w-full">
  <span class="flex gap-2 grow items-center">
    {#if item.type === CollectionType.TYPED && (item.avatar || item.typeToExtend?.avatar)}
      <AvatarRenderer
        avatar={item.avatar ?? item.typeToExtend?.avatar}
        size={Size.sm}
      />
    {:else if item.type === CollectionType.QUERY}
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
