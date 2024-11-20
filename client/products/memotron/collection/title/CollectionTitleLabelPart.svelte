<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { CollectionType, type ICollectionThumb } from "../collection.type";
  export let item: ICollectionThumb;
  export let isShowFallbackIcons: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;

  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
</script>

<span class="flex gap-2 items-center min-w-0 userdata">
  {#if item.type === CollectionType.TYPED && (item.avatar || item.typeToExtend?.avatar)}
    <AvatarRenderer
      avatar={item.avatar ?? item.typeToExtend?.avatar}
      size={Size.sm}
    />
  {:else if item.type === CollectionType.QUERY}
    <Icon icon="at-symbol" size={Size.sm} />
  {:else if isShowFallbackIcons}
    <Icon icon="ph:circles-four" size={Size.sm} />
  {/if}
  <span class="text-left truncate font--medium userdata">
    {#if item.label}
      {item.label}
    {:else}
      {resolveEmptyLabel()}
    {/if}
  </span>
</span>
