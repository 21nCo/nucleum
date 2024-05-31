<script lang="ts">
  import { toggleSearchParam } from "$lib/client/utils/browser.utils";
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import NodeTopBar from "./topBar/NodeTopBar.svelte";
  import NodeMainPanel from "./NodeMainPanel.svelte";
  import {
    resolveActiveNodeStore,
    type ActiveNodeStoreType
  } from "./node.store";
  import Curation from "../curation/Curation.svelte";
  import { Item } from "$lib/client/types/item.enum";
  import { prefixTable } from "$lib/client/utils/text.utils";
  import NodeRightPanel from "./rightPanel/NodeRightPanel.svelte";
  import { generateUID, isFSplit } from "$lib/client/utils/utils";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v2";
  let mdId = generateUID();
  let isRenderSplitView = false;
  $: console.log({ id });
  // $: isRenderSplitView =
  //   !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let isShowBacklinks = false;
  let node: ActiveNodeStoreType;
  $: if (id) node = resolveActiveNodeStore(id);
  let isLoading = false;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    fetchNode();
  }
  $: if (isRenderSplitView) {
    toggleSearchParam(
      isFSplit() ? ResourceAccessMode.FSPLIT : ResourceAccessMode.SPLIT,
      prefixTable(id, Item.nodelinks)
    );
    setTimeout(() => {
      toggleSearchParam("blr", true);
    }, 100);
  }
  async function fetchNode() {
    console.log("fetching node", id, new Date());
    isLoading = true;
    isShowBacklinks = false;
    await node.fetch(id);
    console.log("fetch node complete", id, new Date());
    isLoading = false;
  }
</script>

<div class="w-full h-full flex flex-col bg-bgs1">
  {#if $node && !isLoading}
    {#if isShowBacklinks}
      <Curation
        id={prefixTable(id, Item.nodelinks)}
        on:back={() => {
          isShowBacklinks = false;
        }}
      />
    {:else}
      <div class="flex flex-col h-full w-full gap-4">
        <NodeTopBar
          {id}
          {nodePageVariant}
          on:backlinks={(e) => {
            isShowBacklinks = true;
          }}
        />
        <div class="w-full flex-grow flex gap-4">
          <NodeMainPanel {id} {mdId} />
          <NodeRightPanel {id} {mdId} {nodePageVariant} />
        </div>
      </div>
    {/if}
  {:else}
    <div class="w-full h-full pl-12 pt-4">
      <NodeLoadingPulse />
    </div>
  {/if}
</div>
