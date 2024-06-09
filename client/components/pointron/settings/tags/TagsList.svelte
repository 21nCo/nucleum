<script lang="ts">
  import { tagStore } from "$lib/client/components/pointron/pointron.store";
  import TagItem from "./TagItem.svelte";
  tagStore.refresh();
</script>

<div class="flex gap-2 flex-wrap">
  {#if $tagStore && $tagStore.tags.length > 0}
    {#each $tagStore.tags as tag (tag.id)}
      <TagItem {...tag} />
    {/each}
  {/if}
  <TagItem isAddNew={true} />
</div>
