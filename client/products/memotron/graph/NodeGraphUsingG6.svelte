<script lang="ts">
  import {
    Graph,
    NodeEvent,
    GraphEvent,
    type GraphData,
    type NodeData,
    type EdgeData
  } from "@antv/g6";
  import { onMount, createEventDispatcher } from "svelte";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  const dispatch = createEventDispatcher();

  export let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  export let centerNodeId: string;
  let _data: GraphData = {
    nodes: [],
    edges: []
  };
  const currentColors: any = retrieveCurrentColors($appearance);
  onMount(() => {
    preProcessData();
    renderGraph();
  });

  function preProcessData() {
    _data.nodes = data.nodes.map((node) => {
      const isCurrentNode = node.id === centerNodeId;
      return {
        ...node,
        style: {
          size: isCurrentNode ? 20 : 10,
          halo: isCurrentNode,
          fill: isCurrentNode ? currentColors["aps1"] : currentColors["fgs2"],
          labelText: truncateString(node.label ?? "", 20),
          labelFill: isCurrentNode
            ? currentColors["aps1"]
            : currentColors["fgs3"]
        }
      };
    });
    _data.edges = data.edges.map((edge) => {
      return {
        ...edge,
        // type: "cubic"
        type: "line"
        // startArrow: true,
        // endArrow: true
      } as EdgeData;
    });
  }

  function renderGraph() {
    const graph = new Graph({
      container: "nodegraphcontainer",
      autoFit: "view",
      data: _data,
      animation: false,
      node: {
        style: {
          // size: 10
          // labelFill: "orange",
          // labelFill: "white"
          // labelClass: "text-fgs1 fill-fgs1 stroke-fgs1",
          // labelFontSize: 10
          // labelBackground: true,
          // labelBackgroundFill: "darkgray",
          // labelBackgroundFillOpacity: 1
        },
        palette: {
          field: "group",
          color: "tableau"
        }
      },
      behaviors: [
        "drag-canvas",
        "zoom-canvas",
        "drag-element",
        "click-select",
        {
          type: "hover-activate",
          degree: 1
        }
      ],
      // layout: {
      //   type: "radial",
      //   focusNode: centerNodeId,
      //   linkDistance: 150,
      //   maxIteration: 1000,
      //   preventOverlap: true,
      //   nodeSize: 10,
      //   manyBody: {},
      //   x: {},
      //   y: {}
      // }
      layout: {
        type: "dendrogram",
        radial: true,
        nodeSep: 200,
        rankSep: 300
      }
    });

    graph.render();
    graph.on(GraphEvent.AFTER_RENDER, onAfterRender);
    graph.on(NodeEvent.CLICK, onNodeClick);
  }

  function onAfterRender() {
    dispatch("render");
  }

  function onNodeClick(event: any) {
    if (event.target.id) {
      dispatch("select", event.target.id);
    }
  }
</script>

<div id="nodegraphcontainer" class="w-full h-full" />
