<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import {
    resolveNodeContextMenu,
    resolveVisibleActions,
    type IActiveNodeStore
  } from "../node.store";
  import NodeTitle from "../title/NodeTitle.svelte";
  import { NodeRightPaneType, NodeType } from "../node.type";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import CollectionsLane from "./CollectionsLane.svelte";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let isHovering: boolean = false;
  export let rightPane: NodeRightPaneType | undefined = undefined;
  let dev_isShowMainProperties: boolean = false;
  let contextMenu = [];
  let buttonCommonProps = {
    tooltipOptions: {
      placement: Placement.TopCenter,
      offsetInPx: 6
    }
  };

  $: contextMenu = resolveNodeContextMenu($node, ResourceAccessPoint.SELF, {
    isMediaNode: true
  });

  function onPanelAction(param: NodeRightPaneType) {
    if (rightPane === param) {
      rightPane = undefined;
      return;
    }
    rightPane = param;
  }
</script>

<!-- Using transition here caused modal freeze issue -->
<div
  class={cn("flex flex-col w-full justify-center items-center", {
    "mb-6 absolute z-10 bottom-0": $node.accessMode === ResourceAccessMode.FULL,
    relative:
      $node.accessMode === ResourceAccessMode.POP ||
      $node.accessMode === ResourceAccessMode.INLINE
  })}
>
  <HoverableElement
    bind:isHovering
    class={cn("flex flex-col gap-3 justify-center items-center", {
      "w-full":
        $node.accessMode === ResourceAccessMode.POP ||
        $node.accessMode === ResourceAccessMode.INLINE,
      "mo:w-full tp:w-4/5 dp:w-3/5 2k:w-[50rem] rounded-md":
        $node.accessMode === ResourceAccessMode.FULL
    })}
  >
    {#if $node.isArchived || $node.trashInformation}
      <div
        class={cn("bg-bgs2 rounded-md p-4 border border-brs2 shadow-md", {
          "absolute z-10 bottom-full mb-2 w-[98%]":
            $node.accessMode === ResourceAccessMode.POP ||
            $node.accessMode === ResourceAccessMode.INLINE,
          "w-full": $node.accessMode === ResourceAccessMode.FULL
        })}
      >
        <ResourceStatusBanner resource={node} />
      </div>
    {/if}
    <div
      class={cn(
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 shadow-md rounded-b-md border border-brs2 p-3",
        {
          "w-full": $node.accessMode === ResourceAccessMode.POP,
          "rounded-md": $node.accessMode === ResourceAccessMode.FULL
        }
      )}
    >
      <div class="flex gap-3 justify-between items-center w-full">
        <span class="flex items-center gap-4 flex-1 min-w-0">
          <NodeTitle {node} />
          <div class="text-b3 text-fgs3 whitespace-nowrap">
            {formatDatetime($userPreferences, $node.createdAt)}
          </div>
        </span>
        <span class="flex gap-5">
          <ToggleGroup
            selected={rightPane}
            items={resolveVisibleActions($node.contentType)}
            class="gap-5"
            on:change={(e) => {
              onPanelAction(e.detail);
            }}
            on:none={() => {
              rightPane = undefined;
            }}
          />
          <ContextMenuAction
            {contextMenu}
            id="mediaNodeContextMenu"
            on:action={(e) => {
              if (e.detail === NodeRightPaneType.METADATA) {
                rightPane = e.detail;
              }
            }}
          />
          <div class="h-8">
            <Divider
              orientation={Orientation.Vertical}
              colorStrength={ColorStrength.Strong}
            />
          </div>
          {#if $node.contentType != NodeType.VIDEO}
            <Button
              {...buttonCommonProps}
              icon="full-screen"
              tooltip="Full screen"
              on:click={() => {
                dispatch("fullscreen");
              }}
            />
          {/if}
          {#if $node.accessMode === ResourceAccessMode.FULL}
            <Button
              {...buttonCommonProps}
              icon="cross-circled"
              tooltip="Close"
              on:click={() => {
                appStore.closeResource({ inlineRestoreId: $node.id });
              }}
            />
          {/if}
        </span>
      </div>
      {#if dev_isShowMainProperties}
        <div class="w-full">
          <NodePropertiesPane {node} isVisibleProps={true} />
        </div>
      {/if}
      <div class="flex w-full justify-between">
        <div>
          <CollectionsLane {node} />
        </div>
      </div>
    </div>
  </HoverableElement>
</div>
