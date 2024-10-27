<script lang="ts">
  import { Graph, CanvasEvent, NodeEvent } from "@antv/g6";
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import { linker } from "../linking/link.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";

  const data = {
    nodes: [],
    edges: []
  };

  onMount(async () => {
    await fetchData();
    renderGraph();
  });

  async function fetchData() {
    const nodes = await nodeStore.selectMany();
    const links = await linker.selectMany();
    console.log({ nodes, links });
    const edges = links
      .filter(
        (link) =>
          link.in &&
          link.out &&
          link.in.toString().includes("node") &&
          link.out.toString().includes("node")
      )
      .map((link) => ({
        source: link.in.toString(),
        target: link.out.toString()
      }));
    data.nodes = nodes
      .filter(
        (node) =>
          edges.some((edge) => edge.source === node.id.toString()) ||
          edges.some((edge) => edge.target === node.id.toString())
      )
      .map((node) => ({
        id: node.id.toString(),
        label: node.label
      }));
    data.edges = edges;
  }

  function renderGraph() {
    const graph = new Graph({
      container: "container",
      autoFit: "view",
      data,
      node: {
        style: {
          size: 10
        },
        palette: {
          field: "group",
          color: "tableau"
        }
      },
      layout: {
        type: "d3-force",
        manyBody: {},
        x: {},
        y: {}
      },
      behaviors: ["drag-canvas", "zoom-canvas", "drag-element", "click-select"]
    });

    graph.render();

    graph.on(NodeEvent.CLICK, onNodeClick);
  }

  function onNodeClick(event: any) {
    console.log("onNodeClick", event);
    if (event.target.id) {
      appStore.openResource(event.target.id, ResourceAccessMode.POP);
    }
  }
</script>

<div id="container" class="w-full h-full" />
