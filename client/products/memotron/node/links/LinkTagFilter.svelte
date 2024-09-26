<script lang="ts">
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { linkTagStore } from "../../linking/link.store";
  import { linkTagLabelMapper } from "../../linking/link.utils";
  import type { INodeLinkThumb } from "../node.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let links: INodeLinkThumb[] = [];
  export let selected: string[] = [];

  $: tags = $linkTagStore
    .filter((x) =>
      links.some((y) =>
        y.linkTags?.map((z) => z.toString()).includes(x.id.toString())
      )
    )
    .map(linkTagLabelMapper);

  function resolveCount(tagId: string) {
    return links.filter((x) =>
      x.linkTags?.map((y) => y.toString()).includes(tagId)
    ).length;
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each tags as tag}
    <div class="flex gap-2">
      <Tag
        label={tag.label}
        count={resolveCount(tag.id.toString())}
        size={Size.md}
        isActive={selected.includes(tag.id.toString())}
        isRemovable={false}
        on:click={(e) => {
          if (selected.includes(tag.id.toString())) {
            selected = selected.filter((x) => x !== tag.id.toString());
          } else {
            selected = [...selected, tag.id.toString()];
          }
          dispatch("change");
        }}
      />
    </div>
  {/each}
</div>
