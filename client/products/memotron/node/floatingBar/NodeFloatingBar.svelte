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
  import { Orientation, Position } from "$lib/client/types/direction.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher } from "svelte";
  import { MemotronAction } from "../../memotronAction.enum";
  import {
    resolveNodeContextMenu,
    resolveVisibleActions,
    type IActiveNodeStore
  } from "../node.store";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  export let selectedView: string = "Content";
  export let isWidened: boolean = false;
  let bgIndex = 1;
  let buttonCommonProps = {
    parentBgIndex: bgIndex,
    tooltipOptions: {
      placement: Position.TopCenter,
      offsetInPx: 6
    }
  };
  let contextMenu = [];
  $: contextMenu = resolveNodeContextMenu($node, ResourceAccessPoint.SELF);
  $: currentMode = appStore.determineCurrentResourceAccessMode($node.id);
</script>

<div
  class={cn(
    "flex justify-between items-center mo:w-full tp:w-4/5 dp:w-[48rem] h-14 shadow-md border border-brs2 rounded-md px-4",
    bg(bgIndex - 1)
  )}
>
  <span>
    <!-- <Button label="Content" style={ButtonStyle.PLAIN} /> -->
    <PanelSwitcher
      bind:value={selectedView}
      parentBgIndex={bgIndex}
      items={["Content", "Bird view"]}
      style={PanelSwitcherStyle.BAR}
      barStyle={BarStyle.DOT}
    />
  </span>
  <span class="flex items-center gap-3 h-full">
    <ToggleGroup
      items={resolveVisibleActions($node.contentType)}
      class="gap-5"
      on:change={(e) => {
        // onPanelAction(e.detail);
      }}
      on:none={() => {
        // rightPane = undefined;
      }}
    />
    <ContextMenuAction
      tooltipOptions={buttonCommonProps.tooltipOptions}
      {contextMenu}
      id="nodeContextMenu"
      tooltip="More actions"
    />
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
    {#if currentMode === ResourceAccessMode.SPLIT || currentMode === ResourceAccessMode.FSPLIT}
      <Button
        {...buttonCommonProps}
        icon="cross-circled"
        tooltip="Close split view"
        on:click={() => {
          appStore.closeResource({ accessMode: currentMode });
        }}
      />
    {:else}
      <Button
        {...buttonCommonProps}
        icon={isWidened ? "unwiden" : "widen"}
        tooltip={isWidened ? "Collapse" : "Expand"}
        on:click={() => {
          isWidened = !isWidened;
        }}
      />
      {#if currentMode !== ResourceAccessMode.FULL}
        <Button
          {...buttonCommonProps}
          icon="split"
          tooltip="Open in split view"
          on:click={() => {
            dispatch("split");
          }}
        />
      {/if}
    {/if}
    <Button
      {...buttonCommonProps}
      icon={accessMode === ResourceAccessMode.FULL ? "collapse" : "full-screen"}
      tooltip={accessMode === ResourceAccessMode.FULL
        ? "Minimize"
        : "Full screen"}
      on:click={() => {
        appStore.toggleFocusAccessMode(accessMode, $node.id);
      }}
    />
    {#if accessMode != ResourceAccessMode.INLINE}
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
