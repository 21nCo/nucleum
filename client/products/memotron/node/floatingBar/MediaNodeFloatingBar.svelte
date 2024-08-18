<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import {
    appStore,
    isInEditMode,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { MemotronAction } from "../../memotronAction.enum";
  import { resolveNodeContextMenu, type IActiveNodeStore } from "../node.store";
  import NodeTitle from "../title/NodeTitle.svelte";
  import { NodeType } from "../node.type";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import NodePropertiesOnMainPanel from "../content/NodePropertiesOnMainPanel.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import NodeMetadataPane from "../metadata/NodeMetadataPane.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  export let isHovering: boolean = false;
  export let renderingDetails: any;
  let overlay: string | undefined = undefined;
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
    {#if overlay || $node.isArchived || $node.trashInformation}
      <div
        class={cn("bg-bgs2 rounded-md p-4 border border-brs2 shadow-md", {
          "absolute z-10 bottom-full mb-2 w-[98%]":
            accessMode === ResourceAccessMode.POP ||
            accessMode === ResourceAccessMode.INLINE,
          "w-full": accessMode === ResourceAccessMode.FOCUS
        })}
      >
        {#if overlay === "properties"}
          <div class="flex flex-col gap-4 w-full items-start">
            <Text content="Properties" style={TextStyle.SECTION_HEADING} />
            <NodePropertiesPane {node} isMediaNode={true} />
          </div>
        {:else if overlay === "notes"}
          <div class="flex flex-col h-80 gap-4 w-full items-start">
            <Text content="Notes" style={TextStyle.SECTION_HEADING} />
          </div>
        {:else if overlay === "metadata"}
          <div
            class="flex flex-col h-60 gap-4 w-full items-start overflow-auto"
          >
            <Text content="Metadata" style={TextStyle.SECTION_HEADING} />
            <NodeMetadataPane {node} isMediaNode={true} {renderingDetails} />
          </div>
        {:else if $node.isArchived || $node.trashInformation}
          <ResourceStatusBanner resource={node} />
        {/if}
      </div>
    {/if}
    <div
      class={cn(
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 shadow-md rounded-b-md border border-brs2 p-4",
        {
          "w-full": accessMode === ResourceAccessMode.POP,
          "rounded-md": accessMode === ResourceAccessMode.FOCUS
        }
      )}
    >
      <div class="flex justify-between items-center w-full">
        <span>
          <NodeTitle {node} />
        </span>
        <span class="flex gap-5">
          <Button
            {...buttonCommonProps}
            icon="document-text"
            tooltip="Footnotes"
            on:click={() => {
              if (overlay === "notes") {
                overlay = undefined;
                return;
              }
              overlay = "notes";
            }}
          />
          <Button
            {...buttonCommonProps}
            icon="widget"
            tooltip="Show properties"
            on:click={() => {
              if (overlay === "properties") {
                overlay = undefined;
                return;
              }
              overlay = "properties";
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
          <Button
            {...buttonCommonProps}
            icon="info"
            tooltip="Show metadata"
            on:click={() => {
              if (overlay === "metadata") {
                overlay = undefined;
                return;
              }
              overlay = "metadata";
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
        {#if $node.contentType === NodeType.WEB_PAGE}
          <Button
            icon="arrow-up-right"
            label="Open link"
            size={Size.xs}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              appStore.openLink($node.body.url);
            }}
          />
        {/if}
        <div></div>
        <div class="text-b4 text-fgs3 mt-2">
          Created {formatDatetime($userPreferences, $node.createdAt)}
        </div>
      </div>
    </div>
  </HoverableElement>
</div>
