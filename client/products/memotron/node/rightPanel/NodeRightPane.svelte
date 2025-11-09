<script lang="ts">
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import { cn } from "@21n/utils/ui.utils";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import NodeRightPanelContent from "@21n/products/memotron/node/rightPanel/NodeRightPaneContent.svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import view from "@21n/stores/view.store";
  import { Display } from "@21n/types/view.type";
  export let node: IActiveNodeStore;
  export let mdId: string;
  export let nodePageVariant: "v1" | "v2" = "v2";

  $: isValidPane =
    $node.panel &&
    $node.panel !== ResourcePanelType.NONE &&
    $node.panel !== ResourcePanelType.DEFAULT;
</script>

<aside
  class={cn("flex justify--end gap-2 h-full overflow-auto shrink-0", {
    "mr-2 mb-2 bg-bgs2 rounded-md": nodePageVariant === "v1",
    "max-w-[28rem] w-[28rem]":
      $node.accessMode !== ResourceAccessMode.FULL && isValidPane,
    "min-w-[28rem] cw:border-none border-l border-l-brs2": isValidPane,
    "w-full":
      $node.accessMode === ResourceAccessMode.FULL &&
      !$node.config?.isWidened &&
      isValidPane &&
      $view.display === Display.TK
  })}
>
  {#if isValidPane}
    <NodeRightPanelContent {node} {mdId} />
  {/if}
</aside>
