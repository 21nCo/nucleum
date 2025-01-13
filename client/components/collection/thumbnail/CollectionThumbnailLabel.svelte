<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import type { ICollectionThumb } from "../collection.type";
  import CollectionThumbnailAvatar from "./CollectionThumbnailAvatar.svelte";
  export let item: ICollectionThumb;
  export let isShowFallbackIcons: boolean = false;
  export let isShowAvatar: boolean = true;

  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
</script>

<span class="flex gap-2 items-center min-w-0 userdata">
  {#if isShowAvatar}
    <CollectionThumbnailAvatar {item} {isShowFallbackIcons} />
  {/if}
  <span class="text-left truncate font--medium userdata">
    {#if item.labelSearch}
      {@html renderMdAsHtml(item.labelSearch)}
    {:else if item.label}
      {item.label}
    {:else}
      {resolveEmptyLabel()}
    {/if}
  </span>
</span>
