<script lang="ts">
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { NodeRightPaneType } from "$lib/client/products/memotron/node/node.type";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IActiveNodeStore } from "../node.store";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import NodeRightPanelContent from "./NodeRightPaneContent.svelte";
  export let node: IActiveNodeStore;
  export let mdId: string;
  export let nodePageVariant: "v1" | "v2" = "v2";
  export let isRightPanelCollapsed = true;
  export let pane = NodeRightPaneType.OUTLINE;
  let verticalSwitcherItems: ISelectItem[] = [
    { value: NodeRightPaneType.OUTLINE, icon: "bars-center-left" },
    { value: NodeRightPaneType.LINKS, icon: "ph:link-light" },
    { value: NodeRightPaneType.PROPERTIES, icon: "widget" },
    { value: NodeRightPaneType.TRACES, icon: "bookmark" }
    // { value: NodeRightPaneType.HISTORY, icon: "ph:clock-countdown-thin" }
  ];

  pane = isRightPanelCollapsed
    ? NodeRightPaneType.NONE
    : verticalSwitcherItems[0].label;
  function onRightPanelSwitch(e: CustomEvent) {
    if (pane === e.detail) {
      isRightPanelCollapsed = true;
      pane = NodeRightPaneType.NONE;
    } else {
      isRightPanelCollapsed = false;
      pane = e.detail;
    }
  }
</script>

<aside
  class={cn("flex justify--end gap-2 h-full overflow-auto", {
    "mr-2 mb-2 bg-bgs2 rounded-md": nodePageVariant === "v1",
    "max-w-[28rem] w-[28rem] min-w-[28rem]": !isRightPanelCollapsed
  })}
>
  <div
    class={cn("flex flex-col justify-between items-center", {
      " border-r border-r-brs2": !isRightPanelCollapsed
    })}
  >
    <VerticalSwitcher
      items={verticalSwitcherItems}
      itemProps={{
        activeStatusPlacement: Placement.Left,
        isHideLabel: true
      }}
      isHideBar={isRightPanelCollapsed}
      selected={pane}
      style={VerticalSwitcherStyle.DOT}
      on:switch={onRightPanelSwitch}
    />
  </div>
  {#if !isRightPanelCollapsed}
    <NodeRightPanelContent {node} {mdId} {pane} on:close />
  {/if}
</aside>
