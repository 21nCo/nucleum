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
  import { resolveNodeLabel, resolveNodeLabelString } from "../node/node.utils";
  import NodeAvatar from "../node/avatar/NodeAvatar.svelte";
  import NodeTitleLabelPart from "../node/title/NodeTitleLabelPart.svelte";
  import { activeResourceFilterV2 } from "$lib/client/utils/utils";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import view from "$lib/client/stores/view.store";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";

  let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let isRendered = false;
  let isLoading = false;
  let isHideOrphans = false;
  let _nodes: any[] = [];
  let _edges: any[] = [];
  let graphRef: GlobalGraphUsingG6;
  let splitResource: IRecordId | undefined = undefined;
  let containerWidth = 0;
  $: isConstrainedWidth = containerWidth < 1000 || $view.isConstrainedWidth;

  onMount(async () => {
    await fetchData();
    applyFilters();
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
          target: link.out.toString(),
          id: link.id.toString()
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
          id: allNodesList,
          ...activeResourceFilterV2
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
          // contentType: [...rootNodeTypeList, ...headingNodeTypes],
          contentType: [...rootNodeTypeList],
          creationContext: false,
          ...activeResourceFilterV2
        }
      });
      // console.log({ nodesWithLinks, allRootNodes, links });
      const nodes = [...nodesWithLinks, ...allRootNodes];
      _nodes = nodes
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
      _edges = edges
        .filter((x) => {
          return (
            x.source &&
            x.target &&
            _nodes.some((y) => y.id === x.source) &&
            _nodes.some((y) => y.id === x.target)
          );
        })
        .filter(removeDuplicatesFilter);
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  function applyFilters() {
    if (isHideOrphans) {
      const nodes = _nodes.filter((node) => {
        return _edges.some(
          (edge) => edge.source === node.id || edge.target === node.id
        );
      });
      data.nodes = nodes;
      data.edges = _edges;
      return;
    }
    data.nodes = _nodes;
    data.edges = _edges;
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

  function onNodeSelect(e: CustomEvent) {
    const event = e.detail;
    const newResource = event.target.id;
    logger.log({
      at: "globalGraph - onNodeSelect",
      event,
      newResource,
      splitResource
    });
    if (!newResource) return;
    if (splitResource === newResource) {
      closeSplitResource();
      return;
    }
    splitResource = newResource;
    appStore.resourceClickHandlerForGraph(newResource, event);
  }
  function closeSplitResource() {
    if (!splitResource) return;
    appStore.closeResource({ id: splitResource });
    splitResource = undefined;
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
      <EmptyStatusView isLoadingState={isLoading} mainText="Not enough data." />
    </div>
  {/if}
  {#if data.nodes.length > 0}
    <div
      class="flex justify-between items-center gap-4 bg-bgs2 rounded-md h-12 w-full px-6"
      use:resizeListener={(e) => {
        containerWidth = e.width;
      }}
    >
      <span class="flex gap-3 items-center whitespace-nowrap"> Graph </span>
      <span class="flex items-center gap-3 text-fgs3 text-b3 h-full">
        {#if !isConstrainedWidth}
          <span>
            {data.nodes.length} nodes
          </span>
          <span>
            {data.edges.length} connections
          </span>
          <Divider
            orientation={Orientation.Vertical}
            colorStrength={ColorStrength.Strong}
          />
        {/if}
        <SwitchInput
          label={{ label: "Hide orphans" }}
          size={Size.sm}
          bind:checked={isHideOrphans}
          on:change={() => {
            applyFilters();
            graphRef?.rerender();
          }}
        />
      </span>
    </div>
    <GlobalGraphUsingG6
      bind:this={graphRef}
      {data}
      on:render={onRender}
      on:select={onNodeSelect}
      on:canvasClick={onCanvasClick}
      layout="d3-force"
    />
  {/if}
</div>
