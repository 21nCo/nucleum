<script lang="ts">
  import {
    Graph,
    NodeEvent,
    GraphEvent,
    type GraphData,
    type NodeData,
    type EdgeData,
    CanvasEvent
  } from "@antv/g6";
  import { onMount, createEventDispatcher } from "svelte";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { resizeListener } from "$lib/client/actions/resize.action";
  const dispatch = createEventDispatcher();

  export let data: {
    nodes: any[];
    edges: any[];
    combos: any[];
  } = { nodes: [], edges: [], combos: [] };
  export let centerNodeId: string;
  let graph: Graph;
  let _data: GraphData = {
    nodes: [],
    edges: [],
    combos: []
  };
  const currentColors: any = retrieveCurrentColors($appearance);
  onMount(() => {
    preProcessData();
    renderGraph();
  });

  export function rerender() {
    if (!graph) return;
    graph.destroy();
    preProcessData();
    renderGraph();
  }

  function preProcessData() {
    _data.nodes = data.nodes.map((node) => {
      const isCurrentNode = node.id === centerNodeId;
      return {
        ...node,
        style: {
          size: isCurrentNode ? 40 : 30,
          halo: isCurrentNode,
          badge: isCurrentNode,
          badges: [
            { text: node.badge?.toString() ?? "", placement: "right-bottom" }
          ],
          // badgeFill: currentColors["fgs1"],
          fill:
            node.fill ??
            (isCurrentNode ? currentColors["aps1"] : currentColors["fgs3"]),
          labelText: truncateString(node.label ?? "", 20),
          labelFill: isCurrentNode
            ? currentColors["aps1"]
            : currentColors["fgs2"],
          icon: node.icon ? true : false,
          iconSrc: node.icon,
          iconFill: currentColors["aps1"]
        }
      };
    });
    _data.edges = data.edges.map((edge) => {
      return {
        ...edge,
        // type: "cubic"
        type: "line"
      } as EdgeData;
    });
    _data.combos = data.combos;
    console.log({ at: "preProcessData", _data });
  }

  function resolveLayout(method: string) {
    switch (method) {
      case "dendrogram-1":
        return {
          type: "dendrogram",
          radial: true,
          nodeSep: 200,
          rankSep: 300,
          preventOverlap: true
        };
      case "force-1":
        return {
          type: "force",
          linkDistance: 200, // Reduced from 450 to keep nodes closer
          preventOverlap: true,
          nodeSpacing: 50, // Minimum spacing between nodes
          nodeStrength: -100, // Negative value pushes nodes apart
          edgeStrength: 0.8, // Edge elasticity (0-1)
          alphaDecay: 0.01, // Slower cooling for better convergence
          gravity: 0.5, // Center gravity force
          clustering: true, // Better combo handling
          clusterNodeStrength: 0.5, // Strength of clustering for combo nodes
          // Optional: center the focus node
          // center: [width / 2, height / 2],
          focusNode: centerNodeId
        };
      case "force-2":
        return {
          type: "force",
          linkDistance: 450,
          preventOverlap: true
        };
      case "radial-1":
        return {
          type: "radial",
          focusNode: centerNodeId
        };
      case "radial-2":
        return {
          type: "radial",
          focusNode: centerNodeId,
          linkDistance: 150,
          maxIteration: 1000,
          preventOverlap: true,
          nodeSize: 10,
          manyBody: {},
          x: {},
          y: {}
        };
      case "radial-3":
        return {
          type: "radial",
          focusNode: centerNodeId,
          preventOverlap: true,
          nodeSize: 40, // Should match your largest node size
          unitRadius: 150, // Distance between levels
          strictRadial: false, // Allows some flexibility in positioning
          nodeSpacing: 40, // Minimum spacing between nodes
          maxIteration: 200 // More iterations for better layout
        };
    }
  }

  function renderGraph() {
    graph = new Graph({
      container: centerNodeId + "_graph",
      // autoFit: "view",
      autoFit: "center",
      data: _data,
      animation: false,
      node: {
        style: {
          badgeBackgroundFill: currentColors["bgs4"],
          badgeFontSize: 12
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
      edge: {
        type: "line",
        style: {
          labelText: (d) => d.linkType,
          labelFill: currentColors["fgs3"],
          labelFontSize: 11,
          labelBackground: true,
          labelBackgroundFill: currentColors["bgs1"],
          labelBackgroundOpacity: 1,
          labelBackgroundRadius: 6,
          labelPadding: [2, 5, 2, 5]
          // endArrow: true
          // badge: true,
          // badgeText: "\ue603",
          // badgeFontFamily: "iconfont",
          // badgeBackgroundWidth: 12,
          // badgeBackgroundHeight: 12
        }
      },
      combo: {
        type: "rect",
        // type: "circle",
        style: {
          labelText: (d) => d.id,
          labelBackground: true,
          labelPadding: [4, 12, 4, 12],
          labelBackgroundOpacity: 1,
          labelFill: currentColors["bgs1"],
          labelBackgroundFill: currentColors["ass1"],
          padding: [16, 16, 16, 16],
          labelBackgroundRadius: 6
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
      layout: resolveLayout("dendrogram-1")
    });

    graph.render();
    graph.on(GraphEvent.AFTER_RENDER, onAfterRender);
    graph.on(NodeEvent.CLICK, onNodeClick);
    graph.on(CanvasEvent.CLICK, onCanvasClick);
  }

  function onCanvasClick(event: any) {
    dispatch("canvasClick");
  }

  function onAfterRender() {
    dispatch("render");
  }

  function onNodeClick(event: any) {
    dispatch("select", event);
  }
</script>

<div
  id={centerNodeId + "_graph"}
  use:resizeListener={(e) => {
    if (graph) {
      graph.resize();
    }
  }}
  class="w-full h-full"
/>
