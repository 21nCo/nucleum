<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeGraphUsingG6 from "./NodeGraphUsingG6.svelte";

  export let nodeId: string;
  export let layout: string;
  export let data: {
    nodes: any[];
    edges: any[];
    combos: any[];
  } = { nodes: [], edges: [], combos: [] };
  let isRendered = false;
  let graphRef: NodeGraphUsingG6;

  export function rerender() {
    graphRef?.rerender();
  }

  function onRender() {
    isRendered = true;
  }
</script>

<div class="relative w-full h-full flex justify-center items-center">
  {#if !isRendered}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      <EmptyStatusView isLoadingState={true} />
    </div>
  {/if}
  {#if data?.nodes && data.nodes.length > 0}
    <NodeGraphUsingG6
      bind:this={graphRef}
      {data}
      {layout}
      centerNodeId={nodeId}
      on:select
      on:render={onRender}
      on:canvasClick
    />
  {/if}
</div>
