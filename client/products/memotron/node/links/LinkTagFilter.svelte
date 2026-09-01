<script lang="ts">
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import Tag from "@21n/elements/text/Tag.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { Size } from "@21n/types/size.enum";
  import { linkTagStore } from "@21n/products/memotron/linking/link.store";
  import { linkTagLabelMapper } from "@21n/products/memotron/linking/link.utils";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  let {
    links = [],
    selected = $bindable([]),
    onChange = undefined
  }: {
    links?: INodeLinkThumb[];
    selected?: IRecordId[];
    onChange?: (() => void) | undefined;
  } = $props();

  let tags = $derived.by(
    () =>
      $linkTagStore
        ?.filter((x) => links.some((y) => y.tags?.some(resourceInList(x))))
        ?.map(linkTagLabelMapper) ?? []
  );

  function resolveCount(tagId: IRecordId) {
    return links.filter((x) => x.tags?.some(resourceInList(tagId))).length;
  }
</script>

{#if tags.length > 0}
  <div class="flex flex-wrap gap-2">
    {#each tags as tag}
      <div class="flex gap-2">
        <Tag
          label={tag.label}
          count={resolveCount(tag.id)}
          size={Size.md}
          isActive={selected.some(resourceInList(tag.id))}
          isRemovable={false}
          onclick={() => {
            if (selected.some(resourceInList(tag.id))) {
              selected = selected.filter((x) => !resourceInList(tag.id)(x));
            } else {
              selected = [...selected, tag.id];
            }
            onChange?.();
          }}
        />
      </div>
    {/each}
  </div>
{:else}
  <span class="w-full text-center text-b2 text-fgs3">
    No relations present.
  </span>
{/if}
