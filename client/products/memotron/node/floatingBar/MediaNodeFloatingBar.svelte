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
  import { NodeRightPaneType, NodeType, NodeView } from "../node.type";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import CollectionsLane from "./CollectionsLane.svelte";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import view from "$lib/client/stores/view.store";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let isHovering: boolean = false;
  export let bottomAction: NodeRightPaneType | undefined = undefined;
  export let nodeView: NodeView | undefined;
  let dev_isShowMainProperties: boolean = false;
  let buttonCommonProps = {
    tooltipOptions: {
      placement: Placement.TopCenter,
      offsetInPx: 6
    }
  };
  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;

  function onPanelAction(param: NodeRightPaneType) {
    if (bottomAction === param) {
      bottomAction = undefined;
      return;
    }
    bottomAction = param;
  }
</script>

<!-- Using transition here caused modal freeze issue -->
<div
  class={cn("flex flex-col w-full justify-center items-center", {
    "mb-6 absolute z-10 bottom-0":
      $node.accessMode === ResourceAccessMode.SLIDESHOW,
    "relative mo:mb-8 cw:mb-8":
      $node.accessMode !== ResourceAccessMode.SLIDESHOW
  })}
>
  <div
    use:hoverable={{
      onHover: (e) => {
        isHovering = e;
      }
    }}
    class={cn("flex flex-col gap-3 justify-center items-center", {
      "w-full": $node.accessMode !== ResourceAccessMode.SLIDESHOW,
      "mo:w-full w-9/10 max-w-9/10 2k:w-[80rem] rounded-md":
        $node.accessMode === ResourceAccessMode.SLIDESHOW
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
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 mo:p-2 p-3",
        {
          "border-t border-t-brs2": isConstrainedWidth,
          "border border-brs2": !isConstrainedWidth,
          "rounded-b-md": $node.accessMode === ResourceAccessMode.POP,
          "w-full": $node.accessMode !== ResourceAccessMode.SLIDESHOW,
          "rounded-md shadow-md":
            $node.accessMode === ResourceAccessMode.SLIDESHOW
        }
      )}
    >
      <div class="flex gap-3 justify-between items-center w-full">
        <span class="flex items-center gap-4 flex-1 min-w-0">
          <NodeTitle
            node={$node}
            on:labelChange={(e) => {
              if ($node.label) node.debouncedModify({ label: $node.label });
            }}
            on:editModeChange={(e) => {
              $node.isInEditMode = e.detail;
            }}
          />
          {#if !isConstrainedWidth}
            <div class="text-b3 text-fgs3 whitespace-nowrap">
              {formatDatetime($userPreferences, $node.createdAt)}
            </div>
          {/if}
        </span>
        <span class="flex gap-5">
          {#if !isConstrainedWidth}
            <Toggle
              icon="ph:bird-thin"
              tooltip="Bird view"
              on={nodeView === NodeView.BIRD_VIEW}
              on:change={(e) => {
                dispatch(NodeView.BIRD_VIEW, e.detail);
              }}
            />
            <ToggleGroup
              selected={bottomAction}
              items={resolveVisibleActions($node.contentType, {
                accessMode: $node.accessMode
              })}
              class="gap-5"
              on:change={(e) => {
                onPanelAction(e.detail);
              }}
              on:none={() => {
                bottomAction = undefined;
              }}
            />
          {/if}
          <ContextMenuAction
            menuResolver={() =>
              resolveNodeContextMenu($node, ResourceAccessPoint.SELF, {
                isMediaNode: true,
                accessMode: $node.accessMode
              })}
            id="mediaNodeContextMenu"
            position={Placement.TopCenter}
            on:action={(e) => {
              if (
                e.detail === NodeRightPaneType.METADATA ||
                e.detail === NodeRightPaneType.PROPERTIES ||
                e.detail === NodeRightPaneType.SIDENOTES ||
                e.detail === NodeRightPaneType.LINKS ||
                e.detail === NodeRightPaneType.TRACES
              ) {
                bottomAction = e.detail;
              }
            }}
          />
          {#if !isConstrainedWidth}
            <div class="h-8">
              <Divider
                orientation={Orientation.Vertical}
                colorStrength={ColorStrength.Strong}
              />
            </div>
          {/if}
          {#if $node.contentType != NodeType.VIDEO && !isConstrainedWidth}
            <Button
              {...buttonCommonProps}
              icon="full-screen"
              tooltip="Full screen"
              on:click={() => {
                dispatch("fullscreen");
              }}
            />
          {/if}
          {#if $node.accessMode === ResourceAccessMode.FULL || $node.accessMode === ResourceAccessMode.SLIDESHOW}
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
  </div>
</div>
