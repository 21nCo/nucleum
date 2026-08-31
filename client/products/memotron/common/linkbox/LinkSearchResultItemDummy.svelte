<script lang="ts">
  import { type INode } from "@21n/products/memotron/node/node.type";
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import type { IObjectiveThumb } from "@21n/components/goals/goal.type";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import type { Resource } from "@21n/data/datafn/resource.enum";
  let {
    item,
    isHideResourceType = false,
    resourceType
  }: {
    item: INode | ICollectionThumb | IObjectiveThumb;
    isHideResourceType?: boolean;
    resourceType: Resource;
  } = $props();
</script>

<LinkSearchResultItem {item} {isHideResourceType} {resourceType} />
