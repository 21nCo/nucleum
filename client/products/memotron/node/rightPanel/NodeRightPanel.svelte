<script lang="ts">
  import Mentions from "$lib/client/components/markdown/Mentions.svelte";
  import TableOfContents from "$lib/client/components/markdown/TableOfContents.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import {
    LinkType,
    NodeType,
    RightPanelType
  } from "$lib/client/products/memotron/node/node.type";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import DirectLinks from "../../common/foreLinks/DirectLinks.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import NodeMetadataPane from "./NodeMetadataPane.svelte";
  import NodePropertiesPane from "./NodePropertiesPane.svelte";
  export let node: IActiveNodeStore;
  export let mdId: string;
  export let nodePageVariant: "v1" | "v2" = "v2";
  let selectedRightPanel = RightPanelType.OUTLINE;
  let isRightPanelCollapsed = true;
  let verticalSwitcherItems = [
    { label: RightPanelType.FORELINKS, icon: "arrow-up-right" },
    { label: RightPanelType.PROPERTIES, icon: "widget" },
    { label: RightPanelType.METADATA, icon: "info" }
  ];
  //mentions - as sub section in forelinks
  // if (node.type === NodeType.MARKDOWN) {
  //   verticalSwitcherItems = [
  //     { label: RightPanelType.MENTIONS, icon: "at-symbol" },
  //     ...verticalSwitcherItems
  //   ];
  // }
  if (
    $node?.contentType === NodeType.NODULAR_MARKDOWN ||
    $node?.contentType === NodeType.NON_NODULAR_MARKDOWN ||
    $node?.contentType === NodeType.PDF
  ) {
    verticalSwitcherItems = [
      { label: RightPanelType.OUTLINE, icon: "bars-center-left" },
      { label: RightPanelType.TRACES, icon: "bookmark" },
      ...verticalSwitcherItems
    ];
  }
  selectedRightPanel = isRightPanelCollapsed
    ? RightPanelType.NONE
    : verticalSwitcherItems[0].label;
  function onRightPanelSwitch(e: CustomEvent) {
    if (selectedRightPanel === e.detail) {
      isRightPanelCollapsed = true;
      selectedRightPanel = RightPanelType.NONE;
    } else {
      isRightPanelCollapsed = false;
      selectedRightPanel = e.detail;
    }
  }
</script>

<aside
  class={cn("flex justify-end gap-4 pr-2 pt-4", {
    "mr-2 mb-2 bg-bgs2 rounded-md": nodePageVariant === "v1",
    "border-l border-l-brs2": nodePageVariant != "v1" && !isRightPanelCollapsed,
    "pl-2": isRightPanelCollapsed,
    "p-4 w-96 min-w-[21rem]": !isRightPanelCollapsed
  })}
>
  {#if !isRightPanelCollapsed}
    <div class="flex flex-col h-full flex-grow items-start gap-3">
      <Text
        content={properCase(selectedRightPanel)}
        style={TextStyle.SECTION_HEADING}
      />
      {#if selectedRightPanel === RightPanelType.OUTLINE}
        <TableOfContents {mdId} />
      {:else if selectedRightPanel === RightPanelType.FORELINKS}
        <div class="flex flex-col items-start gap-4 h-full w-full">
          <div class="flex flex-col items-start gap-2">
            <!-- <Text content="Direct" style={TextStyle.SECTION_HEADING_SMALL} />
            <DirectLinks
              links={$node?.forelinks?.filter(
                (x) => x.linkType === LinkType.DIRECT
              )}
              context="nodepage"
            /> -->
            <Text content="Mentions" style={TextStyle.SECTION_HEADING_SMALL} />
            <Mentions />
          </div>
        </div>
      {:else if selectedRightPanel === RightPanelType.PROPERTIES}
        <NodePropertiesPane {node} />
      {:else if selectedRightPanel === RightPanelType.TRACES}
        <NodeMetadataPane {node} />
      {:else if selectedRightPanel === RightPanelType.METADATA}
        <NodeMetadataPane {node} />
      {/if}
    </div>
  {/if}
  <div class="flex flex-col justify-between items-center">
    <!-- <Button
    icon={isRightPanelCollapsed ? "chevdoubleright" : "chevdoubleleft"}
    size={Size.sm}
    on:click={() => {
      isRightPanelCollapsed = !isRightPanelCollapsed;
      if (isRightPanelCollapsed) selectedRightPanel = RightPanelType.NONE;
      else selectedRightPanel = verticalSwitcherItems[0].label;
    }}
  /> -->
    <VerticalSwitcher
      items={verticalSwitcherItems}
      itemProps={{
        activeStatusPlacement: Position.Left,
        isHideLabel: true
      }}
      isHideBar={isRightPanelCollapsed}
      selected={selectedRightPanel}
      style={VerticalSwitcherStyle.BAR}
      on:switch={onRightPanelSwitch}
    />
  </div>
</aside>
