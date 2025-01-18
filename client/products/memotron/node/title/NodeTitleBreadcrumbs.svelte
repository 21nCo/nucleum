<script lang="ts">
  import type { IBreadcrumbItem } from "$lib/client/elements/breadcrumbsV2/breadcrumbItem.type";
  import { createEventDispatcher, onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { nodeStore } from "../node.store";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import Breadcrumbs from "$lib/client/elements/breadcrumbsV2/Breadcrumbs.svelte";
  const dispatch = createEventDispatcher();
  export let mdParent: IRecordId[] | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  export let currentLabel: string | undefined = undefined;
  let breadcrumbs: IBreadcrumbItem[] | undefined = undefined;
  onMount(async () => {
    breadcrumbs = await refreshBreadcrumbs();
    if (breadcrumbs && breadcrumbs.length > 0 && currentLabel) {
      breadcrumbs.push({
        label: currentLabel,
        resourceId: id?.toString()
      });
    }
  });
  /**
   * Note: Querying in this component instead of pre fetching for both thumbnails and node fetch due to latency for this query.
   *
   * "(fn::memotron::node::parent($parent.id)) as mdParent"
   */
  async function refreshBreadcrumbs() {
    let parentItems = [];
    if (mdParent) {
      parentItems = await nodeStore.selectMany({
        filters: {
          id: mdParent?.map((x) => x.toString())
        }
      });
    } else if (!isExtensionEnvironment()) {
      const result = await nodeStore.selectMany({
        properties: [
          "(select * from (fn::memotron::node::parent($parent.id))) as mdParent"
        ],
        filters: {
          id: id?.toString()
        }
      });
      if (result) parentItems = result[0].mdParent;
    }
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
  <Breadcrumbs
    items={breadcrumbs}
    isPreventDefault={true}
    on:click={onBreadcrumbClick}
  />
{/if}
