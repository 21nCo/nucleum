<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import { linker } from "../linking/link.store";
  import GlobalGraphUsingG6 from "./GlobalGraphUsingG6.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { headingNodeTypes, rootNodeTypeList } from "../node/node.type";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { resolveNodeLabel, resolveNodeLabelString } from "../node/node.utils";
  import NodeAvatar from "../node/avatar/NodeAvatar.svelte";
  import NodeTitleLabelPart from "../node/title/NodeTitleLabelPart.svelte";

  let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let isRendered = false;
  let isLoading = false;
  onMount(async () => {
    await fetchData();
  });

  async function fetchData() {
    isLoading = true;
    try {
      const links = await linker.selectMany();
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
      const allNodesList = Array.from(
        new Set(edges.map((link: any) => [link.source, link.target]).flat())
      );
      const nodesWithLinks = await nodeStore.selectMany({
        properties: [
          "id",
          "label",
          "parent.* as parent",
          "body",
          "contentType"
        ],
        filters: {
          // contentType: [...rootNodeTypeList, ...headingNodeTypes]
          id: allNodesList
        }
      });
      const allRootNodes = await nodeStore.selectMany({
        properties: [
          "id",
          "label",
          "parent.* as parent",
          "body",
          "contentType"
        ],
        filters: {
          contentType: [...rootNodeTypeList, ...headingNodeTypes]
        }
      });
      console.log({ nodesWithLinks, allRootNodes, links });
      const nodes = [...nodesWithLinks, ...allRootNodes];
      data.nodes = nodes
        .map((node: any) => {
          return {
            id: node.id.toString(),
            label: resolveNodeLabelString(node),
            innerHTML: renderComponentToString(node),
            innerHTMLTest: `<div>${node.label}</div>`,
            type: "circle"
          };
        })
        .filter(removeDuplicatesFilter);
      data.edges = edges;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  function renderComponentToString(node: any) {
    const component = new NodeTitleLabelPart({
      target: document.createElement("div"),
      props: {
        item: node
      }
    });

    const html = component.$$.root.innerHTML;
    component.$destroy();
    return html;
  }

  function onRender() {
    isRendered = true;
  }

  function onNodeSelect(event: CustomEvent) {
    if (event.detail) {
      appStore.openResource(event.detail, ResourceAccessMode.SPLIT);
    }
  }

  function onCanvasClick(event: CustomEvent) {
    appStore.closeResource({ accessMode: ResourceAccessMode.SPLIT });
  }
</script>

<div
  class="relative w-full h-full flex flex-col justify-center items-center p-3"
>
  {#if !isRendered}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      <EmptyStatusView isLoadingState={isLoading} />
    </div>
  {/if}
  {#if data.nodes.length > 0}
    <div
      class="flex justify-between items-center gap-4 bg-bgs2 rounded-md h-12 w-full px-6"
    >
      <span class="flex gap-3 items-center whitespace-nowrap">
        Graph
        <Badge text="beta" />
      </span>
      <span class="flex items-center gap-3 text-fgs3 text-b3">
        <span>
          {data.nodes.length} nodes
        </span>
        <span>
          {data.edges.length} connections
        </span>
      </span>
    </div>
    <GlobalGraphUsingG6
      {data}
      on:render={onRender}
      on:select={onNodeSelect}
      on:canvasClick={onCanvasClick}
    />
  {/if}
</div>
