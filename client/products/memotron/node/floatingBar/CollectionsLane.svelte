<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { toasts } from "@21n/stores/notification.store";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import LinkItems from "@21n/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkSearch from "@21n/products/memotron/common/linkbox/LinkSearch.svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { resolveNodeContentLabel, resolveNodeIcon } from "@21n/products/memotron/node/node.utils";
  import {
    resourceAction,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import { headingNodeTypes, NodeType } from "@21n/products/memotron/node/node.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { ResourceError } from "@21n/components/error/errors";
  import { ResourceErrorCode } from "@21n/components/error/error.type";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import view from "@21n/stores/view.store";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { resolveProductConfig } from "@21n/products/product.config";
  import { Action } from "@21n/types/action.enum";

  let {
    node,
    isReadOnlyMode = false
  }: {
    node: IActiveNodeStore;
    isReadOnlyMode?: boolean;
  } = $props();
  let popoverRef: any;
  let isPreventContentTypeRender = $derived(
    headingNodeTypes.includes($node.contentType)
  );
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
      onclick={() => {
        appStore.closeResource();
        const path = $view.isPortrait
          ? resourceAction(Resource.node, ResourceActionType.BROWSE)
          : Action.LIBRARY;
        appStore.gotoPath(`/${path}`, {
          queryParams: {
            resource: Resource.node,
            type: $node.contentType.toLowerCase(),
            [AppSearchParam.RETURN_TO]: resolveProductConfig().homePathPt
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
        onUnlink={onUnlink}
        onClick={onClick}
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
