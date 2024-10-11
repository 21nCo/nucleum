<script lang="ts">
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { linkTagStore } from "../../linking/link.store";
  import { linkTagLabelMapper } from "../../linking/link.utils";
  import type { INodeLinkThumb } from "../node.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: INodeLinkThumb[] = [];
  export let selected: IRecordId[] = [];

  $: tags = $linkTagStore
    .filter((x) => links.some((y) => y.tags?.some(resourceInList(x))))
    .map(linkTagLabelMapper);

  function resolveCount(tagId: IRecordId) {
    return links.filter((x) => x.tags?.some(resourceInList(tagId))).length;
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each tags as tag}
    <div class="flex gap-2">
      <Tag
        label={tag.label}
        count={resolveCount(tag.id)}
        size={Size.md}
        isActive={selected.some(resourceInList(tag.id))}
        isRemovable={false}
        on:click={(e) => {
          if (selected.some(resourceInList(tag.id))) {
            selected = selected.filter((x) => !resourceInList(tag.id)(x));
          } else {
            selected = [...selected, tag.id];
          }
          dispatch("change");
        }}
      />
    </div>
  {/each}
</div>
