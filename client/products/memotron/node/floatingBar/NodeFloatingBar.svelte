<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import {
    nodeStore,
    resolveNodeContextMenu,
    resolveVisibleActions,
    type IActiveNodeStore
  } from "../node.store";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import { NodeRightPaneType, NodeView } from "../node.type";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let nodeView: NodeView = NodeView.CONTENT;
  export let isWidened: boolean = false;
  export let isConstrainedWidth: boolean = false;
  let bgIndex = 1;
  let toggleGroupRef: ToggleGroup;
  let selectedToggleAction: string | undefined = undefined;
  let buttonCommonProps = {
    parentBgIndex: bgIndex,
    tooltipOptions: {
      placement: Placement.TopCenter,
      offsetInPx: 6
    }
  };

  export function resetToggle() {
    toggleGroupRef?.reset();
  }
</script>

<div
  class={cn(
    "flex justify-between items-center shadow-md border border-brs2 px-4",
    bg(bgIndex - 1),
    {
      "h-14 w-9/10 rounded-full": isConstrainedWidth,
      "tp:w-4/5 lp:w-[40rem] dp:w-[48rem] h-14 rounded-md": !isConstrainedWidth
    }
  )}
>
  {#if isConstrainedWidth}
    <Button
      label={$node.accessMode === ResourceAccessMode.SPLIT ||
      $node.accessMode === ResourceAccessMode.FSPLIT
        ? "Close split"
        : "Back"}
      icon={$node.accessMode === ResourceAccessMode.SPLIT ||
      $node.accessMode === ResourceAccessMode.FSPLIT
        ? "ph:x-light"
        : "ph:arrow-left-light"}
      size={Size.sm}
      style={ButtonStyle.PLAIN}
      on:click={() => {
        appStore.closeResource({ id: $node.id, accessMode: $node.accessMode });
      }}
    />
  {:else}
    <span>
      <!-- <Button label="Content" style={ButtonStyle.PLAIN} /> -->
      <PanelSwitcher
        bind:value={nodeView}
        parentBgIndex={bgIndex}
        items={[
          {
            label: "Content",
            value: NodeView.CONTENT
          },
          {
            label: "Bird view",
            value: NodeView.BIRD_VIEW
          }
        ]}
        style={PanelSwitcherStyle.BAR}
        barStyle={BarStyle.DOT}
        on:switch={(e) => {
          dispatch("view", e.detail);
        }}
      />
    </span>
  {/if}
  <span class="flex items-center gap-3 h-full">
    {#if nodeView === NodeView.CONTENT}
      <ToggleGroup
        bind:this={toggleGroupRef}
        selected={selectedToggleAction}
        items={resolveVisibleActions($node.contentType, {
          accessMode: $node.accessMode,
          isConstrainedWidth
        })}
        class="gap-5"
        on:change={(e) => {
          if (
            e.detail === NodeRightPaneType.SIDENOTES ||
            e.detail === NodeRightPaneType.LINKS ||
            e.detail === NodeRightPaneType.PROPERTIES
          ) {
            dispatch("panel", e.detail);
          } else if (e.detail === "readMode") {
            nodeStore.toggleReadMode($node.id, true);
          }
        }}
        on:none
      />
    {/if}
    <ContextMenuAction
      tooltipOptions={buttonCommonProps.tooltipOptions}
      menuResolver={() =>
        resolveNodeContextMenu($node, ResourceAccessPoint.SELF, {
          accessMode: $node.accessMode,
          isConstrainedWidth,
          nodeView
        })}
      size={Size.lg}
      parentBgIndex={1}
      id="nodeContextMenu"
      tooltip="More actions"
      heading="Node actions"
      position={Placement.TopCenter}
      on:action
    />
    {#if !isConstrainedWidth}
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />

      {#if $node.accessMode !== ResourceAccessMode.SPLIT && $node.accessMode !== ResourceAccessMode.FSPLIT && nodeView === NodeView.CONTENT}
        <Button
          {...buttonCommonProps}
          icon={isWidened
            ? "ph:arrows-in-line-horizontal-light"
            : "ph:arrows-out-line-horizontal-light"}
          tooltip={isWidened ? "Collapse" : "Expand to full width"}
          on:click={() => {
            nodeStore.modify($node.id, {
              config: {
                isWidened: !isWidened
              }
            });
          }}
        />
      {/if}
      <Button
        {...buttonCommonProps}
        icon={$node.accessMode === ResourceAccessMode.FULL
          ? "collapse"
          : "full-screen"}
        tooltip={$node.accessMode === ResourceAccessMode.FULL
          ? "Minimize"
          : "Full screen"}
        on:click={() => {
          appStore.toggleFullScreen($node.accessMode, $node.id);
        }}
      />
      {#if $node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT}
        <Button
          {...buttonCommonProps}
          icon="cross-circled"
          tooltip="Close split view"
          on:click={() => {
            appStore.closeResource({ accessMode: $node.accessMode });
          }}
        />
      {/if}
    {/if}

    {#if $node.accessMode != ResourceAccessMode.INLINE}
      <!-- <Button
        {...buttonCommonProps}
        label="Close node"
        size={Size.xs}
        style={ButtonStyle.PLAIN}
        isUnderlined={true}
        isPreventMinWidth={true}
        tooltip="Close node"
        class="fill-ars1"
        on:click={() => {
          appStore.closeResource({ inlineRestoreId: $node.id });
        }}
      /> -->
      <!-- <span class="text-ars1 text-b2 whitespace-nowrap"> Close page </span> -->
      <!-- <Icon
        icon="cross-circled"
        class="fill-ars1"
        on:click={() => {
          appStore.closeResource({ inlineRestoreId: $node.id });
        }}
      /> -->
    {/if}
  </span>
</div>
