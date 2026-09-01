<script lang="ts">
  import { flushSync, mount, onMount, unmount } from "svelte";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import GlobalGraphUsingG6 from "@21n/products/memotron/graph/GlobalGraphUsingG6.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import {
    headingNodeTypes,
    rootNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import { removeDuplicatesFilter } from "@21n/components/flux/resourceStores/resource.utils";
  import { appStore } from "@21n/stores/app.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { resolveNodeLabelString } from "@21n/products/memotron/node/node.utils";
  import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import { activeResourceFilterV2 } from "@21n/utils/utils";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { logger } from "@21n/components/debug/logger.client";
  import type { IRecordId } from "@21n/types/data.type";
  import MemotronOverviewLayout from "@21n/products/memotron/overview/MemotronOverviewLayout.svelte";

  let data: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  let isRendered = false;
  let isLoading = false;
  let isHideOrphans = false;
  let _nodes: any[] = [];
  let _edges: any[] = [];
  let graphRef: GlobalGraphUsingG6;
  let splitResource: IRecordId | undefined = undefined;
  let isConstrainedWidth = false;

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
      ) as string[];
      const properties = {
        select: ["id", "label", "body", "contentType"],
        expand: ["parent"]
      };
      const nodesWithLinks = await nodeStore.selectMany({
        properties,
        filters: {
          // contentType: [...rootNodeTypeList, ...headingNodeTypes]
          id: allNodesList,
          ...activeResourceFilterV2
        }
      });
      const allRootNodes = await nodeStore.selectMany({
        properties,
        filters: {
          // contentType: [...rootNodeTypeList, ...headingNodeTypes],
          contentType: [...rootNodeTypeList],
          creationContext: false,
          ...activeResourceFilterV2
        }
      });
      const nodes = [...nodesWithLinks, ...allRootNodes];
      _nodes = nodes
        .map((node: any) => {
          const nodeLabel = resolveNodeLabelString(node) || "";
          return {
            id: node.id.toString(),
            label: nodeLabel,
            innerHTML: renderComponentToString(node),
            innerHTMLTest: `<div>${node.label || "Untitled"}</div>`,
            type: "circle"
          };
        })
        .filter(removeDuplicatesFilter);
      _edges = edges
        .filter((x: any) => {
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
    const target = document.createElement("div");
    const component = mount(NodeTitleLabelPart, {
      target,
      props: {
        item: node
      }
    });
    flushSync();
    const html = target.innerHTML;
    void unmount(component);
    return html;
  }

  function onRender() {
    isRendered = true;
  }

  function onNodeSelect(event: any) {
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

  function onCanvasClick() {
    appStore.closeResource({ accessMode: AccessMode.SPLIT });
  }
</script>

<MemotronOverviewLayout bind:isConstrainedWidth>
  {#snippet right()}
    <span class="flex items-center gap-3 text-fgs3 text-b3 h-full">
      {#if !isConstrainedWidth && data.nodes.length > 0}
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
        onChange={() => {
          applyFilters();
          graphRef?.rerender();
        }}
      />
    </span>
  {/snippet}
  {#if !isRendered}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      <EmptyStatusView isLoadingState={isLoading} mainText="Not enough data." />
    </div>
  {/if}
  {#if data.nodes.length > 0}
    <GlobalGraphUsingG6
      bind:this={graphRef}
      {data}
      onRender={onRender}
      onSelect={onNodeSelect}
      onCanvasClick={onCanvasClick}
      layout="d3-force"
    />
  {/if}
</MemotronOverviewLayout>
