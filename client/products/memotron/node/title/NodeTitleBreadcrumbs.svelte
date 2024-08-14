<script lang="ts">
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { Size } from "$lib/client/types/size.enum";
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
    const parentItems = await $dataManager.cacheSource.dexie.node
      .where("id")
      .anyOfIgnoreCase(parent)
      .toArray();
    return parent
      .map((x) => {
        let item = parentItems.find((y) => y.id === x);
        if (!item) return;
        return {
          label: item.label ?? item.body,
          resourceId: x
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
