<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { appStore } from "$lib/client/stores/app.store";
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
  import { ButtonStyle } from "$lib/client/types/button.type";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import { NodeRightPaneType, NodeView } from "../node.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import ResourceInlineCloseButton from "$lib/client/elements/button/ResourceInlineCloseButton.svelte";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let nodeView: NodeView = NodeView.CONTENT;
  export let isWidened: boolean = false;
  export let isConstrainedWidth: boolean = false;
  let bgIndex = 2;
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

  function close() {
    appStore.closeResource({
      id: $node.id,
      accessMode: $node.accessMode
    });
  }
</script>

<div
  class={cn(
    "flex justify-between items-center border-t border-x border-brs3 px-4",
    bg(bgIndex - 1),
    {
      "h-14 w-9/10 rounded-full shadow-md": isConstrainedWidth,
      "tp:w-4/5 lp:w-[40rem] dp:w-[48rem] h-16 rounded-t-md":
        !isConstrainedWidth
    }
  )}
>
  {#if isConstrainedWidth}
    {#if $node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT}
      <div class="flex w-24">
        <DropDown
          items={[
            {
              label: "Content",
              value: NodeView.CONTENT
            },
            {
              label: "Bird view",
              value: NodeView.BIRD
            }
          ]}
          style={InputStyle.PLAIN}
          isDisableSearch={true}
          on:select={(e) => {
            dispatch("view", e.detail);
          }}
        />
      </div>
    {:else}
      {@const isCloseVariant =
        $node.accessMode === ResourceAccessMode.FULL ||
        $node.accessMode === ResourceAccessMode.INLINE}
      <Button
        label={isCloseVariant ? "Close" : "Back"}
        icon={isCloseVariant ? "cross" : "chevron-left"}
        size={Size.sm}
        style={ButtonStyle.PLAIN}
        on:click={close}
      />
    {/if}
  {:else}
    <span>
      <!-- <Button label="Content" style={ButtonStyle.PLAIN} /> -->
      <PanelSwitcher
        bind:value={nodeView}
        parentBgIndex={bgIndex}
        items={[
          {
            label: "Markdown",
            value: NodeView.CONTENT
          },
          {
            label: "Bird view",
            value: NodeView.BIRD
          }
        ]}
        style={PanelSwitcherStyle.BAR}
        barStyle={BarStyle.DOT}
        isPreventTabShortcut={true}
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
        parentBgIndex={bgIndex}
        items={resolveVisibleActions($node, {
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
          } else if (e.detail === ResourceActionType.TOGGLE_READ_MODE) {
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
      parentBgIndex={bgIndex - 1}
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
          icon={isWidened ? "shrink" : "widen"}
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
      {#if $node.accessMode !== ResourceAccessMode.FULL}
        <Button
          {...buttonCommonProps}
          icon="full-screen"
          tooltip="Full screen"
          on:click={() => {
            appStore.toggleFullScreen($node.accessMode, $node.id);
          }}
        />
      {/if}
      <ResourceInlineCloseButton
        accessMode={$node.accessMode}
        id={$node.id}
        parentBgIndex={bgIndex}
      />
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
