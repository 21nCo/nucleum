<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import LinkItems from "../../common/linkbox/LinkItems.svelte";
  import LinkSearch from "../../common/linkbox/LinkSearch.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { resolveNodeContentLabel, resolveNodeIcon } from "../node.utils";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import { headingNodeTypes, NodeType } from "../node.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { ResourceErrorCode } from "$lib/client/components/error/error.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";

  export let node: IActiveNodeStore;
  export let isReadOnlyMode: boolean = false;
  let popoverRef: any;
  $: isPreventContentTypeRender = headingNodeTypes.includes($node.contentType);
  async function onUnlink(e: CustomEvent) {
    await node.unlinkCollection(e.detail);
  }
  async function onSelect(item: any) {
    try {
      hidePopover();
      const id = item.id;
      if (!id) {
        toasts.error();
        return;
      }
      if ($node.collections?.some(resourceInList(id))) {
        toasts.error("Collection already exists.");
        return;
      }
      const result = await node.linkCollection(id);
      if (!result) {
        toasts.error();
        return;
      }
    } catch (e) {
      logger.error({ at: "CollectionsLane.onSelect", error: e });
      if (e instanceof ResourceError) {
        if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
          toasts.error("Collection already exists.");
        } else {
          toasts.error();
        }
      } else {
        toasts.error();
      }
    }
  }

  function onClick(e: CustomEvent) {
    appStore.resourceClickHandler(e.detail.event, e.detail.item);
  }
  function hidePopover() {
    popoverRef?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<div class="flex gap-2 items-center h-full w-full overflow-x-auto mo:pr-4">
  {#if !isPreventContentTypeRender}
    <button
      class="flex items-center gap-2 h-full border border-bgs4 hover:border-fgs3 rounded-full px-2 py-0.5 text-b2 whitespace-nowrap bg-bgs2 text-fgs1"
      on:click={() => {
        appStore.closeResource();
        appStore.gotoPath("/library", {
          queryParams: {
            resource: Resource.node,
            type: $node.contentType.toLowerCase()
          }
        });
      }}
      use:tooltip={{
        text: `See all ${resolveNodeContentLabel($node.contentType)} nodes`,
        direction:
          $node.contentType === NodeType.NODULAR_MARKDOWN
            ? Placement.Bottom
            : Placement.Top
      }}
    >
      <Icon
        icon={resolveNodeIcon($node.contentType)}
        size={Size.sm}
        class="fill-fgs1"
      />
      {resolveNodeContentLabel($node.contentType)}
    </button>
    <span class="h-full flex items-center justify-center">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
    </span>
  {/if}

  {#if $node.collections && $node.collections.length > 0}
    <span>
      <LinkItems
        accessPoint={ResourceAccessPoint.SELF}
        links={$node.collections}
        {isReadOnlyMode}
        on:unlink={onUnlink}
        on:click={onClick}
      />
    </span>
  {/if}
  {#if !isReadOnlyMode}
    <div
      bind:this={popoverRef}
      use:popover={{
        content: LinkSearch,
        isRenderAsModalForCW: true,
        cwModalPosition: Placement.Top,
        id: "collections-lane-popover",
        componentProps: {
          onSelectCallback: onSelect,
          searchQuery: "",
          onHideCallback: () => {
            hidePopover();
          },
          accessPoint: ResourceAccessPoint.NODE,
          isCollectionsLane: true
        }
      }}
    >
      <Button icon="plus" size={Size.sm} tooltip="Add to a collection" />
    </div>
  {/if}
</div>
