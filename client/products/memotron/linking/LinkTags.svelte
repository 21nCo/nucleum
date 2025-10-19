<script lang="ts">
  import Tag from "@21n/elements/text/Tag.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { Size } from "@21n/types/size.enum";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  import { linker, linkTagStore } from "@21n/products/memotron/linking/link.store";
  import { createEventDispatcher } from "svelte";
  import { linkTagLabelMapper } from "@21n/products/memotron/linking/link.utils";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let link: INodeLinkThumb;
  $: _tags = $linkTagStore
    ?.filter((x) => link.tags?.some(resourceInList(x)))
    ?.map(linkTagLabelMapper);

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

<div class="flex gap-2 flex-wrap userdata">
  {#each _tags as tag}
    <Tag
      label={tag.label}
      size={Size.sm}
      icon="relation"
      on:click={(e) => onTagClick(tag.id, e)}
      on:remove={() => onRemove(tag.id)}
    />
  {/each}
</div>
