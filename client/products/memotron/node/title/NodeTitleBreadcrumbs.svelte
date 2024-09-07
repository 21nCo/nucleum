<script lang="ts">
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { Size } from "$lib/client/types/size.enum";
  import { flux } from "$lib/client/persistence/dataManagerv2";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  export let node: IActiveNodeStore;
  let breadcrumbs: BreadcrumbItem[] | undefined = undefined;
  onMount(() => {
    node.subscribe(async (x) => {
      if (x.parent) breadcrumbs = await refreshBreadcrumbs(x.parent);
    });
  });
  async function refreshBreadcrumbs(parent: string[]) {
    console.log("refreshing breadcrumbs", { node: $node });
    if (!parent) return;
    const parentItems = await flux.selectMany(Resource.node, {
      filters: {
        id: parent
      }
    });
    console.log({ parentItems });
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
    console.log("onBreadcrumbClick", e);
    if (!e.detail.item.resourceId) return;
    node.eventStore.set({
      event: e.detail.event,
      id: e.detail.item.resourceId
    });
  }
  $: console.log({ node: $node });
</script>

{#if breadcrumbs && breadcrumbs.length > 0}
  <Breadcrumb
    items={breadcrumbs}
    isPreventDefault={true}
    spaceAvailable={Size.lg}
    on:click={onBreadcrumbClick}
  />
{/if}
