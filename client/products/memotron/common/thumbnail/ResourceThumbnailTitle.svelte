<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
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

<div class="flex justify-between w-full">
  <span class="flex gap-2 grow">
    {#if type === MemotronResourceType.NODE}
      <!--TODO Avatar and parent breadcrumbs for node -->
    {:else if type === MemotronResourceType.TYPED_COLLECTION && item.avatar}
      <AvatarView avatar={item.avatar} size={Size.sm} />
    {:else if type === MemotronResourceType.QUERY_COLLECTION}
      <Icon icon="at-symbol" size={Size.sm} />
    {/if}
    <span class="text-left w-5/6 truncate font-medium">
      <!-- TODO - if node and has parent, show breadcrumbs -->
      {#if item.label}
        {item.label}
      {:else if item.body}
        <InlineMarkdownTextInput content={item.body} />
      {:else}
        {resolveEmptyLabel()}
      {/if}
      <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
    </span>
  </span>
  {#if item.isStarred}
    <Icon icon="star" class="fill-yellow-400" />
  {/if}
</div>
