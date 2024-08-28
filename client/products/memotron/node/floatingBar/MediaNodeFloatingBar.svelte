<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { MemotronAction } from "../../memotronAction.enum";
  import { resolveNodeContextMenu, type IActiveNodeStore } from "../node.store";
  import NodeTitle from "../title/NodeTitle.svelte";
  import { NodeRightPaneType, NodeType } from "../node.type";
  import NodePropertiesOnMainPanel from "../content/NodePropertiesOnMainPanel.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  export let isHovering: boolean = false;
  export let rightPane: NodeRightPaneType | undefined = undefined;
  let contextMenu = [];
  let buttonCommonProps = {
    tooltipOptions: {
      placement: Position.TopCenter,
      offsetInPx: 6
    }
  };
  $: propertiesOnMainPanel = $node?.propertyConfig?.filter(
    (x) => x.isShowOnNodePage
  );
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
    "mb-6 absolute z-10 bottom-0": accessMode === ResourceAccessMode.FOCUS,
    relative:
      accessMode === ResourceAccessMode.POP ||
      accessMode === ResourceAccessMode.INLINE
  })}
>
  <HoverableElement
    bind:isHovering
    class={cn("flex flex-col gap-3 justify-center items-center", {
      "w-full":
        accessMode === ResourceAccessMode.POP ||
        accessMode === ResourceAccessMode.INLINE,
      "mo:w-full tp:w-4/5 dp:w-3/5 2k:w-[50rem] rounded-md":
        accessMode === ResourceAccessMode.FOCUS
    })}
  >
    {#if $node.isArchived || $node.trashInformation}
      <div
        class={cn("bg-bgs2 rounded-md p-4 border border-brs2 shadow-md", {
          "absolute z-10 bottom-full mb-2 w-[98%]":
            accessMode === ResourceAccessMode.POP ||
            accessMode === ResourceAccessMode.INLINE,
          "w-full": accessMode === ResourceAccessMode.FOCUS
        })}
      >
        <ResourceStatusBanner resource={node} />
      </div>
    {/if}
    <div
      class={cn(
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 shadow-md rounded-b-md border border-brs2 p-3",
        {
          "w-full": accessMode === ResourceAccessMode.POP,
          "rounded-md": accessMode === ResourceAccessMode.FOCUS
        }
      )}
    >
      <div class="flex gap-3 justify-between items-center w-full">
        <span class="flex-1 min-w-0">
          <NodeTitle {node} />
        </span>
        <span class="flex gap-5">
          <Button
            {...buttonCommonProps}
            icon="document-text"
            tooltip="Side notes"
            on:click={() => {
              onPanelAction(NodeRightPaneType.SIDENOTES);
            }}
          />
          <Button
            {...buttonCommonProps}
            icon="arrow-up-right"
            tooltip="Show all links"
            on:click={() => {
              onPanelAction(NodeRightPaneType.LINKS);
            }}
          />
          <Button
            {...buttonCommonProps}
            icon="widget"
            tooltip="Show properties"
            on:click={() => {
              onPanelAction(NodeRightPaneType.PROPERTIES);
            }}
          />
          <!-- <EditToggleButton isReadModeVariant={true} /> -->
          <Button
            {...buttonCommonProps}
            tooltip="Serendipity"
            icon="light-bulb"
            on:click={() => {
              appStore.runAction(MemotronAction.SERENDIPITY, {
                componentParams: { id: $node.id }
              });
            }}
          />
          <ContextMenuAction {contextMenu} />
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
          {#if accessMode === ResourceAccessMode.FOCUS}
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
      {#if propertiesOnMainPanel && propertiesOnMainPanel.length > 0}
        <div class="w-full">
          <NodePropertiesOnMainPanel
            {node}
            {propertiesOnMainPanel}
            isMediaNode={true}
          />
        </div>
      {/if}
      <div class="flex w-full justify-between">
        <div></div>
        <div class="text-b3 text-fgs3 mt-2">
          Created {formatDatetime($userPreferences, $node.createdAt)}
        </div>
      </div>
    </div>
  </HoverableElement>
</div>
