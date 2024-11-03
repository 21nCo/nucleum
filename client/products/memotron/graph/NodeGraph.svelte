<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import { linker } from "../linking/link.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeGraphUsingG6 from "./NodeGraphUsingG6.svelte";
  import { createEventDispatcher } from "svelte";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();

  export let nodeId: string;
  export let data: {
    nodes: any[];
    edges: any[];
    combos: any[];
  } = { nodes: [], edges: [], combos: [] };
  let isRendered = false;
  let graphRef: NodeGraphUsingG6;

  onMount(async () => {
    // await refresh();
  });

  export function rerender() {
    graphRef?.rerender();
  }

  /**
   * @deprecated - moved to NodeBirdView.svelte
   */
  export async function refresh() {
    isRendered = false;
    data.nodes = [];
    data.edges = [];
    const inLinks = await linker.selectMany({
      properties: ["id", "in", "out", "(select * from $parent.tags) as tags"],
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
        target: link.out.toString(),
        tags: link.tags.map((tag: any) => tag.group + ":" + tag.label).join(",")
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
        target: link.in.toString(),
        tags: link.tags.map((tag: any) => tag.toString()).join(",")
      }));
    const edges = [...inEdges, ...outEdges];

    const combos = edges
      .map((edge: any) => {
        return {
          id: edge.tags
        };
      })
      .filter(removeDuplicatesFilter);
    data.edges = edges;
    data.combos = combos;
    data.nodes = nodes.map((node: any) => {
      return {
        id: node.id.toString(),
        label: resolveNodeLabel(node),
        combo: edges.find((edge: any) => edge.target === node.id.toString())
          ?.tags
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
      bind:this={graphRef}
      {data}
      centerNodeId={nodeId}
      on:select
      on:render={onRender}
      on:canvasClick
    />
  {/if}
</div>
