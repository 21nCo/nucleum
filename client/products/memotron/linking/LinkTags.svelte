<script lang="ts">
  import Tag from "@21n/elements/text/Tag.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { Size } from "@21n/types/size.enum";
  import type { INodeLinkThumb } from "@21n/products/memotron/node/node.type";
  import { linker, linkTagStore } from "@21n/products/memotron/linking/link.store";
  import { linkTagLabelMapper } from "@21n/products/memotron/linking/link.utils";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";

  let {
    link = $bindable(),
    onTagClick = undefined
  }: {
    link: INodeLinkThumb;
    onTagClick?: ((event: CustomEvent<IRecordId>) => void) | undefined;
  } = $props();
  const tags = $derived.by(
    () =>
      $linkTagStore
        ?.filter((x) => link.tags?.some(resourceInList(x)))
        ?.map(linkTagLabelMapper) ?? []
  );

  async function onRemove(tagId: IRecordId) {
    link.tags = link.tags?.filter((x) => x.toString() !== tagId.toString());
    const linksWithThisTag = link.links?.filter((x) =>
      x.tags?.some(resourceInList(tagId))
    );
    if (linksWithThisTag && linksWithThisTag.length > 0) {
      link.links = link.links?.map((x) => ({
        ...x,
        tags: x.tags?.filter((y) => y.toString() !== tagId.toString())
      }));
      linksWithThisTag.forEach(async (x) => {
        await linker.modify(x.id, {
          tags: x.tags?.filter((y) => y.toString() !== tagId.toString())
        });
      });
    }
  }
  function handleTagClick(tagId: IRecordId, e: MouseEvent) {
    const tagClickEvent = new CustomEvent<IRecordId>("tagClick", {
      detail: tagId
    });
    onTagClick?.(tagClickEvent);
    e.stopPropagation();
  }
</script>

<div class="flex gap-2 flex-wrap userdata">
  {#each tags as tag}
    <Tag
      label={tag.label}
      size={Size.sm}
      icon="relation"
      onclick={(e) => handleTagClick(tag.id, e)}
      onRemove={() => onRemove(tag.id)}
    />
  {/each}
</div>
