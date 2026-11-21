<script lang="ts">
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import NodeGraphUsingG6 from "@nucleum/features/memory/graph/NodeGraphUsingG6.svelte";

  let {
    nodeId,
    layout,
    data = { nodes: [], edges: [], combos: [] },
    onCanvasClick = undefined,
    onSelect = undefined
  }: {
    nodeId: string;
    layout: string;
    data?: {
      nodes: any[];
      edges: any[];
      combos: any[];
    };
    onCanvasClick?: ((event: CustomEvent<void>) => void) | undefined;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
  } = $props();
  let isRendered = false;
  let isLoadFailed = $state(false);
  let loadAttempt = $state(0);
  let graphRef: NodeGraphUsingG6;
  const hasData = $derived(!!(data?.nodes && data.nodes.length > 0));

  export function rerender() {
    graphRef?.rerender();
  }

  export function softUpdate(newData: { nodes?: any[]; edges?: any[] }) {
    graphRef?.softUpdate(newData);
  }

  function onRender() {
    isRendered = true;
  }

  function onLoadError(error: unknown) {
    console.error("Error loading graph:", error);
    isLoadFailed = true;
  }

  function retryLoad() {
    if (loadAttempt > 0) {
      window.location.reload();
      return;
    }
    isLoadFailed = false;
    loadAttempt += 1;
  }

  function handleSelect(event: any) {
    onSelect?.(new CustomEvent("select", { detail: event }));
  }

  function handleCanvasClick() {
    onCanvasClick?.(new CustomEvent("canvasClick"));
  }
</script>

<div class="relative w-full h-full flex justify-center items-center">
  {#if !isRendered}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      {#if isLoadFailed}
        <EmptyStatusView
          mainText="Couldn't load the graph."
          subText="Check your connection and try again."
          actionText={loadAttempt > 0 ? "Reload" : "Retry"}
          onclick={retryLoad}
        />
      {:else}
        <EmptyStatusView isLoadingState={hasData} subText="No links found." />
      {/if}
    </div>
  {/if}
  {#if hasData}
    {#key loadAttempt}
      <NodeGraphUsingG6
        bind:this={graphRef}
        {data}
        {layout}
        centerNodeId={nodeId}
        onSelect={handleSelect}
        {onRender}
        {onLoadError}
        onCanvasClick={handleCanvasClick}
      />
    {/key}
  {/if}
</div>
