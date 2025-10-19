<script lang="ts">
  import { tooltip } from "@21n/actions/popover.action";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import CollectionThumbnailAvatar from "@21n/components/collection/thumbnail/CollectionThumbnailAvatar.svelte";
  export let item: ICollectionThumb;
  export let isShowFallbackIcons: boolean = false;
  export let isShowAvatar: boolean = true;
  export let isShowStarStatus: boolean = false;

  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
</script>

<span class="flex gap-2 items-center min-w-0 userdata">
  {#if isShowAvatar}
    <CollectionThumbnailAvatar {item} {isShowFallbackIcons} />
  {/if}
  <span
    class="text-left truncate userdata text-b2"
    use:tooltip={{
      text: item.label,
      isEnableOnlyOnTruncate: true
    }}
  >
    {#if item.labelSearch}
      {@html renderMdAsHtml(item.labelSearch)}
    {:else if item.label}
      {item.label}
    {:else}
      {resolveEmptyLabel()}
    {/if}
  </span>
  {#if isShowStarStatus}
    <RecordStarStatusFeedback isStarred={item.isStarred} />
  {/if}
</span>
