<script lang="ts">
  import type { IBreadcrumbItem } from "@21n/elements/breadcrumbsV2/breadcrumbItem.type";
  import { onMount } from "svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import Breadcrumbs from "@21n/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import { headingNodeTypes, NodeType, type INode } from "@21n/products/memotron/node/node.type";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import BreadcrumbMini from "@21n/elements/breadcrumb/BreadcrumbMini.svelte";
  let {
    mdParent = undefined,
    id = undefined,
    currentLabel = undefined,
    isThumbnailContext = false,
    onClick = undefined
  }: {
    mdParent?: IRecordId[] | INode[] | undefined;
    id?: IRecordId | undefined;
    currentLabel?: string | undefined;
    isThumbnailContext?: boolean;
    onClick?:
      | ((event: CustomEvent<{ event: MouseEvent; item: IBreadcrumbItem }>) => void)
      | undefined;
  } = $props();

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
        properties: {
          select: ["label", "id", "body"]
        },
        filters: {
          contentType: [...headingNodeTypes, NodeType.NODULAR_MARKDOWN],
          id: mdParent?.map((x) => x.toString())
        }
      });
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
    onClick?.(e as CustomEvent<{ event: MouseEvent; item: IBreadcrumbItem }>);
  }
</script>

{#if breadcrumbs && breadcrumbs.length > 0}
  {#if isThumbnailContext}
    <BreadcrumbMini
      hierarchy={breadcrumbs?.map((x) => x.label)}
      truncateLength={30}
    />
  {:else}
    <Breadcrumbs
      items={breadcrumbs}
      isPreventDefault={true}
      onClick={onBreadcrumbClick}
      limit={4}
    />
  {/if}
{/if}
