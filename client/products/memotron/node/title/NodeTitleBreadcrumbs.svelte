<script lang="ts">
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IActiveNode, INode } from "../node.type";
  import { createEventDispatcher } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  const dispatch = createEventDispatcher();
  export let node: IActiveNode;
  export let breadcrumbs: BreadcrumbItem[] | undefined = undefined;
  onMount(async () => {
    breadcrumbs = await refreshBreadcrumbs(node.parent ?? node.mdParent);
  });
  async function refreshBreadcrumbs(parent: IRecordId[] | INode | undefined) {
    if (!parent || parent.length === 0) return;
    const parentItems = await flux.selectMany(Resource.node, {
      filters: {
        id: "id" in parent ? parent.toString() : parent.map((x) => x.toString())
      }
    });
    if (!parentItems || parentItems.length === 0) return [];
    return parentItems
      .map((x) => {
        return {
          label: x.label ?? x.body,
          resourceId: x.id
        };
      })
      .filter((x) => x);
  }
  function onBreadcrumbClick(e: CustomEvent) {
    if (!e.detail.item.resourceId) return;
    dispatch("click", e.detail);
  }
</script>

{#if breadcrumbs && breadcrumbs.length > 0}
  <Breadcrumb
    items={breadcrumbs}
    isPreventDefault={true}
    spaceAvailable={Size.lg}
    on:click={onBreadcrumbClick}
  />
{/if}
