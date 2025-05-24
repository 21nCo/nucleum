<script lang="ts">
  import type { IBreadcrumbItem } from "$lib/client/elements/breadcrumbsV2/breadcrumbItem.type";
  import { createEventDispatcher, onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { nodeStore } from "../node.store";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import Breadcrumbs from "$lib/client/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import { headingNodeTypes, NodeType, type INode } from "../node.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  const dispatch = createEventDispatcher();
  export let mdParent: IRecordId[] | INode[] | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  export let currentLabel: string | undefined = undefined;
  export let isThumbnailContext: boolean = false;

  let breadcrumbs: IBreadcrumbItem[] | undefined = undefined;
  onMount(async () => {
    breadcrumbs = await refreshBreadcrumbs();
    if (
      breadcrumbs &&
      breadcrumbs.length > 0 &&
      !isThumbnailContext &&
      currentLabel
    ) {
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
    if (
      mdParent &&
      Array.isArray(mdParent) &&
      mdParent.some((x) => typeof x === "object" && "label" in x)
    ) {
      parentItems = mdParent;
    } else if (mdParent) {
      parentItems = await nodeStore.selectMany({
        properties: ["label", "id", "body"],
        filters: {
          contentType: [...headingNodeTypes, NodeType.NODULAR_MARKDOWN],
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
    if (!mdParent || !parentItems || parentItems.length === 0) return [];
    return mdParent
      .map((x) => {
        const item = parentItems.find(resourceInList(x));
        return {
          label: item?.label ?? item?.body,
          resourceId: item?.id
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
  {#if isThumbnailContext}
    <BreadcrumbMini
      hierarchy={breadcrumbs?.map((x) => x.label)}
      on:click={onBreadcrumbClick}
    />
  {:else}
    <Breadcrumbs
      items={breadcrumbs}
      isPreventDefault={true}
      on:click={onBreadcrumbClick}
      limit={4}
    />
  {/if}
{/if}
