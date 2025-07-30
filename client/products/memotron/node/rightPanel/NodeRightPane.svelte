<script lang="ts">
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import {
    canHaveTraces,
    NodeRightPaneType,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IActiveNodeStore } from "../node.store";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import NodeRightPanelContent from "./NodeRightPaneContent.svelte";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { Display } from "$lib/client/types/view.type";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let mdId: string;
  export let nodePageVariant: "v1" | "v2" = "v2";
  export let isRightPanelCollapsed = true;
  export let pane = NodeRightPaneType.OUTLINE;
  let verticalSwitcherItems: ISelectItem[] = [
    { value: NodeRightPaneType.OUTLINE, icon: "text-align-left" },
    { value: NodeRightPaneType.PROPERTIES, icon: "shapes" },
    { value: NodeRightPaneType.LINKS, icon: "link" }
  ];

  if (canHaveTraces.includes($node?.contentType ?? NodeType.UNKNOWN)) {
    verticalSwitcherItems.push({
      value: NodeRightPaneType.TRACES,
      icon: "bookmark"
    });
  }

  $: isValidPane =
    !isRightPanelCollapsed && pane && pane !== NodeRightPaneType.NONE;

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
    dispatch("switch", { isRightPanelCollapsed, pane });
  }

  function resolveVerticalSwitcherItems(links: any[]) {
    return verticalSwitcherItems.map((item) => {
      if (item.value === NodeRightPaneType.LINKS) {
        return { ...item, badge: links?.length ?? 0 };
      }
      return item;
    });
  }
</script>

<aside
  class={cn("flex justify--end gap-2 h-full overflow-auto shrink-0", {
    "mr-2 mb-2 bg-bgs2 rounded-md": nodePageVariant === "v1",
    "max-w-[28rem] w-[28rem]":
      $node.accessMode !== ResourceAccessMode.FULL && isValidPane,
    "min-w-[28rem]": isValidPane,
    "w-full":
      $node.accessMode === ResourceAccessMode.FULL &&
      !$node.config?.isWidened &&
      isValidPane &&
      $view.display === Display.TK
  })}
>
  <div
    class={cn("flex flex-col justify-between items-center", {
      " border-r border-r-brs2": isValidPane
    })}
  >
    <VerticalSwitcher
      items={resolveVerticalSwitcherItems($node.links)}
      itemProps={{
        activeStatusPlacement: isValidPane ? Placement.Right : Placement.Left,
        isHideLabel: true
      }}
      isHideBar={isRightPanelCollapsed}
      selected={pane}
      style={isValidPane
        ? VerticalSwitcherStyle.GRADIENT
        : VerticalSwitcherStyle.DOT}
      on:switch={onRightPanelSwitch}
    />
  </div>
  {#if isValidPane}
    <NodeRightPanelContent {node} {mdId} {pane} on:close />
  {/if}
</aside>
