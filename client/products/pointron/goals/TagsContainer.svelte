<script lang="ts">
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import type { Tag } from "$lib/client/types/pointron/tag.type";
  import { TagId } from "$lib/client/types/pointron/tagId.enum";
  import TagItem from "$lib/client/elements/TagItem.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import { AppSkin } from "$lib/client/types/appearance.type";
  import { prefix } from "$lib/client/utils/text.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let selectedTagId: TagId | string;
  export let disabled: boolean = false;
  export let isShowAddTag: boolean = false;
  let tagList: Tag[] = [];
  function handleTagClick(e: any) {
    // console.log(e.detail);
    selectedTagId = e.detail.id;
    dispatch("select", e.detail.id);
  }

  function getDefaultTags() {
    return [
      {
        label: "All",
        id: TagId.ALL
      },
      {
        label: "Favs",
        id: TagId.FAVORITES
      }
    ];
  }

  async function mapTagList(allTagsWithHash: Tag[]) {
    const defaultTagList = getDefaultTags();
    tagList = [...defaultTagList, ...allTagsWithHash];
  }

  $: {
    mapTagList($tagStore.tags);
  }
</script>

<div class="flex w-full h-7 relative items-center {isShowAddTag && 'pr-8'}">
  <div class="relative h-full w-full flex items-center">
    <div
      class="h-full w-full overflow-x-auto no-scrollbar flex gap-3 {isShowAddTag &&
        'pr-4'}"
    >
      {#each tagList as tag}
        <TagItem
          id={tag.id}
          label={tag.id === TagId.FAVORITES || tag.id === TagId.ALL
            ? tag.label
            : prefix(tag.label, "#")}
          {disabled}
          icon={tag.id === TagId.FAVORITES ? `heart` : ``}
          isActive={tag.id === selectedTagId}
          on:click={handleTagClick}
        />
      {/each}
    </div>
    <div
      class=" w-4 h-full absolute -right-1 {$appearance.skin === AppSkin.Clean
        ? 'fade-overlay'
        : ''}"
    />
  </div>
  {#if isShowAddTag}
    <button
      on:click={() => appStore.runAction(PointronEventEnum.ADD_TAG)}
      tabindex="0"
      class="hover:bg-bgs3 active:scale-105 transition-all hover:bg-opacity-20 w-8 h-8 rounded-full absolute right-0"
      title="Add a new tag"
    >
      +
    </button>
  {/if}
</div>

<style>
  .fade-overlay {
    background-image: linear-gradient(
      to right,
      transparent 0%,
      rgba(var(--colors-bgs1), var(--tw-bg-opacity)) 50%,
      rgba(var(--colors-bgs1), var(--tw-bg-opacity)) 100%
    );
  }
</style>
