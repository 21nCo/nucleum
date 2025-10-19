<script lang="ts">
  import { type INode } from "@21n/products/memotron/node/node.type";
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  export let item: INode | ICollectionThumb | IGoalThumb;
  export let isHideResourceType: boolean = false;
  export let resourceType: Resource;
  //   TODO - same case as Collection.svelte and Task.svelte - resulting in `undefined` after build
</script>

<LinkSearchResultItem {item} {isHideResourceType} {resourceType} />
