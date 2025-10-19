<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import Button from "@21n/elements/button/Button.svelte";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import {
    resolveNodeContextMenu,
    resolveVisibleActions,
    type IActiveNodeStore
  } from "@21n/products/memotron/node/node.store";
  import NodeTitle from "@21n/products/memotron/node/title/NodeTitle.svelte";
  import { NodeRightPaneType, NodeType, NodeView } from "@21n/products/memotron/node/node.type";
  import ResourceStatusBanner from "@21n/components/record/RecordStatusBanner.svelte";
  import { formatDatetime } from "@21n/utils/time.utils";
  import ToggleGroup from "@21n/elements/toggle/ToggleGroup.svelte";
  import CollectionsLane from "@21n/products/memotron/node/floatingBar/CollectionsLane.svelte";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import view from "@21n/stores/view.store";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { Size } from "@21n/types/size.enum";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { isShowStatusBanner } from "@21n/components/flux/resourceStores/resource.utils";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  import ResourceInlineCloseButton from "@21n/elements/button/ResourceInlineCloseButton.svelte";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let isHovering: boolean = false;
  export let isConstrainedWidth: boolean = false;
  export let bottomAction: NodeRightPaneType | undefined = undefined;
  export let nodeView: NodeView | undefined;
  let dev_isShowMainProperties: boolean = false;
  let buttonCommonProps = {
    tooltipOptions: {
      placement: Placement.TopCenter,
      offsetInPx: 6
    }
  };

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
    relative: $node.accessMode !== ResourceAccessMode.SLIDESHOW
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
    {#if isShowStatusBanner($node)}
      <div
        class={cn("rounded-md border border-brs2 shadow-md", {
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
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 mo:p-2 p-3 cw:border-b cw:border-b-brs2 cw:border-t-transparent cw:rounded-none cw:bg-bgs2 cw:otop:pt-12 border-t border-t-brs2",
        {
          "rounded-b-md": $node.accessMode === ResourceAccessMode.POP,
          "w-full": $node.accessMode !== ResourceAccessMode.SLIDESHOW,
          "rounded-md shadow-md":
            $node.accessMode === ResourceAccessMode.SLIDESHOW
        }
      )}
    >
      <div class="flex gap-3 justify-between items-center w-full">
        <span class="flex items-center gap-4 flex-1 min-w-0">
          <BackButton
            isEnabled={$view.isConstrainedWidth &&
              !$node.isInEditMode &&
              $node.accessMode !== ResourceAccessMode.INLINE &&
              $node.accessMode !== ResourceAccessMode.FULL}
            accessMode={$node.accessMode}
            class="min-w-0 flex-1"
          >
            <NodeTitle
              node={$node}
              on:labelChange={(e) => {
                if ($node.label !== undefined)
                  node.modify({ label: $node.label });
              }}
              on:editModeChange={(e) => {
                node.toggleEditMode(e.detail);
              }}
            />
          </BackButton>
          {#if !isConstrainedWidth && !$node.isInEditMode}
            <div class="text-b3 text-fgs3 whitespace-nowrap default-typeface">
              {formatDatetime($userPreferences, $node.createdAt)}
            </div>
          {/if}
        </span>
        <span
          class={cn("flex", {
            "gap-5": !isConstrainedWidth,
            "gap-2": isConstrainedWidth
          })}
        >
          {#if !isConstrainedWidth}
            <Toggle
              icon="bird"
              tooltip="Bird view"
              on={nodeView === NodeView.BIRD}
              on:change={(e) => {
                appStore.toggleSearchParamRecordSpecific($node.id, {
                  [AppSearchParam.NODE_VIEW]: e.detail
                    ? NodeView.BIRD
                    : NodeView.CONTENT
                });
              }}
            />
            <ToggleGroup
              selected={bottomAction}
              items={resolveVisibleActions($node, {
                accessMode: $node.accessMode,
                isConstrainedWidth
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
                accessMode: $node.accessMode,
                isConstrainedWidth
              })}
            id="mediaNodeContextMenu"
            size={Size.lg}
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
          {#if $node.contentType !== NodeType.VIDEO && !isConstrainedWidth && $node.accessMode !== ResourceAccessMode.FULL}
            <Button
              {...buttonCommonProps}
              icon="fullscreen"
              tooltip="Full screen"
              on:click={() => {
                appStore.toggleFullScreen($node.accessMode, $node.id);
              }}
            />
          {/if}
          <ResourceInlineCloseButton
            accessMode={$node.accessMode}
            id={$node.id}
          />
        </span>
      </div>
      {#if dev_isShowMainProperties}
        <div class="w-full">
          <PropertiesPane
            item={node}
            resource={Resource.node}
            isVisibleProps={true}
          />
        </div>
      {/if}
      <div class="flex w-full justify-between">
        <CollectionsLane {node} />
      </div>
    </div>
  </div>
</div>
