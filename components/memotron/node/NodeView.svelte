<script lang="ts">
  import ComingSoonView from "$lib/tidy/elements/ComingSoonView.svelte";
  import SplitView from "$lib/tidy/layout/SplitView.svelte";
  import view from "$lib/tidy/stores/view.store";
  import { toggleSearchParam } from "$lib/tidy/utils/browser.utils";
  import NodeLoadingPulse from "$lib/tidy/elements/feedback/animations/NodeLoadingPulse.svelte";
  import NodeTopBar from "./topBar/NodeTopBar.svelte";
  import NodeMainPanel from "./NodeMainPanel.svelte";
  import {
    resolveActiveNodeStore,
    type ActiveNodeStoreType
  } from "./node.store";
  import CurationView from "../curation/CurationView.svelte";
  import { CurationType } from "$lib/tidy/types/memotron/curation.type";
  import { Item } from "$lib/tidy/types/item.enum";
  import { prefixTable } from "$lib/tidy/utils/text.utils";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import type { Type } from "$lib/tidy/types/memotron/type.type";
  import NodeRightPanel from "./rightPanel/NodeRightPanel.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v2";
  let mdId = generateUID();
  $: isRenderSplitView =
    !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let isShowBacklinks = false;
  let node: ActiveNodeStoreType;
  $: if (id) node = resolveActiveNodeStore(id);
  let isLoading = false;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    fetchNode();
  }
  $: if (isRenderSplitView) {
    setTimeout(() => {
      toggleSearchParam("blr", true);
    }, 100);
    // searchParam("blr", true);
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
  {#if isRenderSplitView && id}
    <SplitView {id} split={prefixTable(id, Item.nodelinks)} />
  {:else if $node && !isLoading}
    {#if isShowBacklinks}
      <CurationView
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
