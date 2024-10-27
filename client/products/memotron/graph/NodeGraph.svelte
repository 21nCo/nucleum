<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import { linker } from "../linking/link.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeGraphUsingG6 from "./NodeGraphUsingG6.svelte";

  export let nodeId: string;
  export let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let isRendered = false;
  onMount(async () => {
    await fetchData();
  });

  async function fetchData() {
    const inLinks = await linker.selectMany({
      filters: {
        in: nodeId
        // out: nodeId
      }
    });
    const outLinks = await linker.selectMany({
      filters: {
        out: nodeId
      }
    });
    const allNodesList = Array.from(
      new Set(
        [...inLinks, ...outLinks].map((link: any) => [link.in, link.out]).flat()
      )
    );
    if (allNodesList.length === 0) allNodesList.push(nodeId);
    const nodes = await nodeStore.selectMany({
      properties: ["label", "body", "id"],
      filters: {
        id: allNodesList
      }
    });
    console.log({ nodes, inLinks, outLinks });
    const inEdges = inLinks
      .filter(
        (link: any) =>
          link.in &&
          link.out &&
          link.in.toString().includes("node") &&
          link.out.toString().includes("node")
      )
      .map((link: any) => ({
        source: link.in.toString(),
        target: link.out.toString()
      }));
    const outEdges = outLinks
      .filter(
        (link: any) =>
          link.in &&
          link.out &&
          link.in.toString().includes("node") &&
          link.out.toString().includes("node")
      )
      .map((link: any) => ({
        source: link.out.toString(),
        target: link.in.toString()
      }));
    const edges = [...inEdges, ...outEdges];
    data.edges = edges;
    data.nodes = nodes.map((node: any) => {
      return {
        id: node.id.toString(),
        label: resolveNodeLabel(node)
      };
    });
  }

  /**
   * TODO - reuse this logic - for GlobalGraph, NodeTitleLabelPart.svelte as well
   * @param node
   */
  function resolveNodeLabel(node: any) {
    if (node.label) return node.label;
    else if (typeof node.body === "string") return node.body;
    else return "Unknown";
  }

  function onNodeSelect(event: CustomEvent<string>) {
    console.log({ at: "onNodeSelect", event, id: event.detail });
    if (event.detail) {
      appStore.openResource(event.detail, ResourceAccessMode.POP);
    }
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
  {#if data.nodes.length > 0}
    <NodeGraphUsingG6
      {data}
      centerNodeId={nodeId}
      on:select={onNodeSelect}
      on:render={onRender}
    />
  {/if}
</div>
