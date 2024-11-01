<script lang="ts">
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { nodeStore } from "../node.store";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  const dispatch = createEventDispatcher();
  export let mdParent: IRecordId[] | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  let breadcrumbs: BreadcrumbItem[] | undefined = undefined;
  onMount(async () => {
    breadcrumbs = await refreshBreadcrumbs();
  });
  async function refreshBreadcrumbs() {
    // "(fn::memotron::node::parent($parent.id)) as mdParent"
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
      console.log({ result, parentItems, id });
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
  <Breadcrumb
    items={breadcrumbs}
    isSubtleContext={true}
    isPreventDefault={true}
    spaceAvailable={Size.lg}
    on:click={onBreadcrumbClick}
  />
{/if}
