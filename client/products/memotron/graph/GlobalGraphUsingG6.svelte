<script lang="ts">
  import { resizeListener } from "$lib/client/actions/resize.action";
  import appearance from "$lib/client/stores/appearance.store";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import { Graph, GraphEvent, NodeEvent, CanvasEvent } from "@antv/g6";
  import { onMount, createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let _data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let graph: Graph;
  const currentColors: any = retrieveCurrentColors($appearance);

  onMount(() => {
    preProcessData();
    renderGraph();
  });

  async function preProcessData() {
    _data.nodes = data.nodes.map((n) => {
      return {
        id: n.id,
        label: n.label,
        type: n.type ?? "circle",
        style: {
          labelText: truncateString(n.label ?? "", 20),
          innerHTML: n.innerHTML,
          size: n.type === "html" ? [120, 40] : 20,
          icon: n.icon ? true : false,
          iconSrc: n.icon
          // iconFill: currentColors["fgs1"]
          // iconText: "👋"
        }
      };
    });
    _data.edges = [...data.edges];
    // console.log({ _data });
  }

  function renderGraph() {
    graph = new Graph({
      container: "globalgraphcontainer",
      data: _data,
      autoFit: "center",
      animation: false,
      node: {
        // palette: {
        //   type: "group",
        //   field: "cluster"
        // }
        style: {
          // size: 10,
          fill: currentColors["fgs2"],
          labelFill: currentColors["fgs3"],
          stroke: currentColors["aps1"]
        },
        state: {
          selected: {
            fill: currentColors["aps1"],
            stroke: currentColors["aps1"],
            haloFill: currentColors["aps1"],
            labelFill: currentColors["aps1"],
            haloStroke: currentColors["aps1"]
          }
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
      layout: {
        type: "d3-force",
        // manyBody: {
        //   gravity: 100
        // },
        linkDistance: 350
      }
    });
    graph.render();
    // graph.draw();
    graph.on(GraphEvent.AFTER_RENDER, onAfterRender);
    graph.on(CanvasEvent.CLICK, onCanvasClick);
    graph.on(NodeEvent.CLICK, onNodeClick);
  }

  function onCanvasClick(e: any) {
    dispatch("canvasClick", e);
  }

  function onNodeClick(event: any) {
    if (event.target.id) {
      dispatch("select", event.target.id);
    }
  }
  function onAfterRender() {
    dispatch("render");
  }
</script>

<div
  id="globalgraphcontainer"
  use:resizeListener={(e) => {
    if (graph) {
      graph.resize();
    }
  }}
  class="w-full h-full w--[50rem] h--[50rem]"
/>
