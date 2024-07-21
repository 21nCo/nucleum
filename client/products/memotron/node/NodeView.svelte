<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import NodeTopBar from "./topBar/NodeTopBar.svelte";
  import NodeMainPanel from "./NodeMainPanel.svelte";
  import { resolveActiveNodeStore, type IActiveNodeStore } from "./node.store";
  import Curation from "../curation/Curation.svelte";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import { prefixTable } from "$lib/shared/utils/text.utils";
  import NodeRightPanel from "./rightPanel/NodeRightPanel.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import { appStore } from "$lib/client/stores/app.store";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let nodePageVariant: "v1" | "v2" = "v2";
  let mdId = generateUID();
  let isRenderSplitView = false;
  $: console.log({ id });
  // $: isRenderSplitView =
  //   !isFromSplitView && $view.width > 1500 && $view.scale > 1.5;
  let isShowBacklinks = false;
  let node: IActiveNodeStore;
  $: if (id) node = resolveActiveNodeStore(id);
  let isLoading = false;
  $: if (id && (isFromSplitView || !isRenderSplitView)) {
    fetchNode();
  }
  $: if (isRenderSplitView) {
    appStore.toggleSearchParam(
      appStore.isFSplit()
        ? ResourceAccessMode.FSPLIT
        : ResourceAccessMode.SPLIT,
      prefixTable(id, Resource.nodelinks)
    );
    setTimeout(() => {
      appStore.toggleSearchParam("blr", true);
    }, 100);
  }
  async function fetchNode() {
    isLoading = true;
    isShowBacklinks = false;
    await node.fetch();
    isLoading = false;
  }
</script>

<div class="w-full h-full flex flex-col bg-bgs1">
  {#if $node && !isLoading}
    {#if isShowBacklinks}
      <Curation
        id={prefixTable(id, Resource.nodelinks)}
        on:back={() => {
          isShowBacklinks = false;
        }}
      />
    {:else}
      <div class="flex flex-col h-full w-full gap-4">
        <NodeTopBar
          {node}
          {nodePageVariant}
          on:backlinks={(e) => {
            isShowBacklinks = true;
          }}
        />
        <div class="w-full flex-grow flex gap-4 p-6">
          <NodeMainPanel {node} {mdId} />
          <NodeRightPanel {node} {mdId} {nodePageVariant} />
        </div>
      </div>
    {/if}
  {:else}
    <div class="w-full h-full pt-4 px-20">
      <NodeLoadingPulse />
    </div>
  {/if}
</div>
