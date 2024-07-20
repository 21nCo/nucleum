<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { Size } from "$lib/client/types/size.enum";
  import { resolveResourceType } from "../../memotron.utils";
  export let item: any;
  const type = resolveResourceType(item);
  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
</script>

<div class="flex gap-2 w-full">
  {#if type === MemotronResourceType.NODE}
    <!--TODO Avatar for node -->
  {:else if type === MemotronResourceType.TYPED_COLLECTION && item.avatar}
    <AvatarView avatar={item.avatar} size={Size.sm} />
  {:else if type === MemotronResourceType.QUERY_COLLECTION}
    <Icon icon="at-symbol" size={Size.sm} />
  {/if}
  <span class="text-left w-5/6 truncate font-medium">
    <!-- TODO - if node and has parent, show breadcrumbs -->
    {item.label ?? resolveEmptyLabel()}
  </span>
</div>
