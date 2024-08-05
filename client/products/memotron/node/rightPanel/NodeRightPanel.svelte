<script lang="ts">
  import TableOfContents from "$lib/client/components/markdown/TableOfContents.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { RightPanelType } from "$lib/client/products/memotron/node/node.type";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IActiveNodeStore } from "../node.store";
  import NodePropertiesPane from "./NodePropertiesPane.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import NodeLinksPane from "./links/NodeLinksPane.svelte";
  import NodeHistoryPane from "./history/NodeHistoryPane.svelte";
  import NodeTracesPane from "./traces/NodeTracesPane.svelte";
  export let node: IActiveNodeStore;
  export let mdId: string;
  export let nodePageVariant: "v1" | "v2" = "v2";
  export let isRightPanelCollapsed = true;
  let selectedRightPanel = RightPanelType.OUTLINE;
  let verticalSwitcherItems: ISelectItem[] = [
    { value: RightPanelType.LINKS, icon: "arrow-up-right" },
    { value: RightPanelType.OUTLINE, icon: "bars-center-left" },
    { value: RightPanelType.PROPERTIES, icon: "widget" },
    { value: RightPanelType.TRACES, icon: "bookmark" },
    { value: RightPanelType.HISTORY, icon: "clock" }
  ];

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
  class={cn("flex justify--end gap-2", {
    "mr-2 mb-2 bg-bgs2 rounded-md": nodePageVariant === "v1",
    "max-w-[28rem] w-[28rem] min-w-[28rem]": !isRightPanelCollapsed
  })}
>
  <div class="flex flex-col justify-between items-center">
    <VerticalSwitcher
      items={verticalSwitcherItems}
      itemProps={{
        activeStatusPlacement: Position.Left,
        isHideLabel: true
      }}
      isHideBar={isRightPanelCollapsed}
      selected={selectedRightPanel}
      style={VerticalSwitcherStyle.DOT}
      on:switch={onRightPanelSwitch}
    />
  </div>
  {#if !isRightPanelCollapsed}
    <div
      class="flex flex-col h-full flex-grow items-start gap-3 border-l border-l-brs2 p-4"
    >
      <Text
        content={properCase(selectedRightPanel)}
        style={TextStyle.PANEL_HEADING_SMALL}
      />
      {#if selectedRightPanel === RightPanelType.OUTLINE}
        <TableOfContents {mdId} />
      {:else if selectedRightPanel === RightPanelType.LINKS}
        <NodeLinksPane {node} />
      {:else if selectedRightPanel === RightPanelType.PROPERTIES}
        <NodePropertiesPane {node} />
      {:else if selectedRightPanel === RightPanelType.TRACES}
        <NodeTracesPane {node} />
      {:else if selectedRightPanel === RightPanelType.HISTORY}
        <NodeHistoryPane />
      {/if}
    </div>
  {/if}
</aside>
