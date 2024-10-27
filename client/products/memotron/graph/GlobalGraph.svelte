<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import { linker } from "../linking/link.store";
  import GlobalGraphUsingG6 from "./GlobalGraphUsingG6.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { headingNodeTypes, rootNodeTypeList } from "../node/node.type";

  let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let isRendered = false;
  onMount(async () => {
    await fetchData();
  });

  async function fetchData() {
    const nodes = await nodeStore.selectMany({
      properties: ["id", "label"],
      filters: {
        // contentType: [...rootNodeTypeList, ...headingNodeTypes]
      }
    });
    const links = await linker.selectMany();
    console.log({ nodes, links });
    const edges = links
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
    data.nodes = nodes.map((node: any) => {
      return {
        id: node.id.toString(),
        label: node.label
      };
    });
    data.edges = edges;
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
    <GlobalGraphUsingG6 {data} on:render={onRender} />
  {/if}
</div>
