<script lang="ts">
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { INodeLinkThumb } from "../node/node.type";
  import { linker, linkTagStore } from "./link.store";
  import { createEventDispatcher } from "svelte";
  import { linkTagLabelMapper } from "./link.utils";
  const dispatch = createEventDispatcher();
  export let link: INodeLinkThumb;
  $: _tags = $linkTagStore
    .filter((x) =>
      link.tags?.map((y) => y.toString()).includes(x.id.toString())
    )
    .map(linkTagLabelMapper);

  async function onRemove(tagId: IRecordId) {
    link.tags = link.tags?.filter((x) => x.toString() !== tagId.toString());
    await linker.modify(link.id, {
      tags: link.tags
    });
  }
  function onTagClick(tagId: IRecordId, e: MouseEvent) {
    dispatch("tagClick", tagId);
    e.stopPropagation();
  }
</script>

<div class="flex gap-2 flex-wrap">
  {#each _tags as tag}
    <Tag
      label={tag.label}
      size={Size.sm}
      icon="ph:tag-thin"
      on:click={(e) => onTagClick(tag.id, e)}
      on:remove={() => onRemove(tag.id)}
    />
  {/each}
</div>
