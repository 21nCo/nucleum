<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import { Graph, GraphEvent } from "@antv/g6";
  import { onMount, createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let _data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
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
        style: {
          labelText: truncateString(n.label ?? "", 20)
        }
      };
    });
    _data.edges = [...data.edges];
    console.log({ _data });
  }

  function renderGraph() {
    const graph = new Graph({
      container: "globalgraphcontainer",
      data: _data,
      autoFit: "view",
      animation: false,
      node: {
        // palette: {
        //   type: "group",
        //   field: "cluster"
        // }
        style: {
          size: 10,
          fill: currentColors["fgs2"],
          labelFill: currentColors["fgs3"],
          haloFill: currentColors["aps1"],
          haloStroke: currentColors["aps1"],
          stroke: currentColors["aps1"]
        },
        state: {
          selected: {
            fill: currentColors["aps1"],
            stroke: currentColors["bgs1"],
            haloFill: currentColors["bgs1"],
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
  }

  function onAfterRender() {
    console.log("onAfterRender");
    dispatch("render");
  }
</script>

<div id="globalgraphcontainer" class="w-full h-full w--[50rem] h--[50rem]" />
