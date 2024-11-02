<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    isSameResource,
    removeDuplicatesFilter,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Switch from "$lib/client/elements/toggle/Switch.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import NodeGraph from "../../graph/NodeGraph.svelte";
  import { linker, linkTagStore } from "../../linking/link.store";
  import { linkTagLabelMapper } from "../../linking/link.utils";
  import { nodeStore, type IActiveNodeStore } from "../node.store";
  import { LinkType, NodeRightPaneType, type INode } from "../node.type";
  import NodeRightPane from "../rightPanel/NodeRightPane.svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type { ILinkTag } from "../../linking/link.type";
  import { onMount } from "svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import view from "$lib/client/stores/view.store";
  import { InputStyle } from "$lib/client/types/input.type";
  export let node: IActiveNodeStore;
  export let isMediaNode: boolean = false;
  export let mdId: string | undefined = undefined;
  let linkedNodes: INode[];
  let isRightPanelCollapsed = true;
  let rightPane = NodeRightPaneType.LINKS;
  let selectedView = "Graph";
  let depth = 1;
  let graphRef: NodeGraph;
  let isAutoGrouping = true;
  let graphData: {
    nodes: any[];
    edges: any[];
    combos: any[];
  };
  const depthOptions = [
    {
      label: "Depth: 1",
      value: 1
    },
    {
      label: "Depth: 2",
      value: 2
    }
    // {
    //   label: "Depth: 3",
    //   value: 3
    // },
    // {
    //   label: "Depth: 4",
    //   value: 4
    // }
  ];
  let groupOptions: DropdownItem[];
  let subgroupOptions: DropdownItem[];
  let tags: ILinkTag[];
  let tagGroups: string[];
  initializeConfig();

  function initializeConfig() {
    tags = $linkTagStore
      .filter((x) => $node.links?.some((y) => y.tags?.some(resourceInList(x))))
      .map(linkTagLabelMapper);
    tagGroups = Array.from(new Set(tags.map((x) => x.group ?? "No group")));

    let commonGroupOptions = [
      { label: "Link tags", value: "linktags" },
      { label: "Link types", value: "linktypes" },
      ...tagGroups.map((x) => ({
        label: x,
        value: x,
        groupId: "Link tag groups"
      }))
    ];

    groupOptions = [
      { label: "Group by: None", value: "none" },
      ...commonGroupOptions
    ];
    subgroupOptions = [
      { label: "Subgroup by: None", value: "none" },
      ...commonGroupOptions
    ];
  }

  onMount(async () => {
    await loadLinkedNodesData();
    await refreshGraphData();
  });

  async function loadLinkedNodesData() {
    linkedNodes = await nodeStore.selectMany({
      filters: {
        id: $node.links?.map((x) => x.linkedTo.toString())
      }
    });
  }

  /**
   * TODO - filters
   */
  async function refreshGraphData() {
    if (isAutoGrouping) {
      let linkTagsInUse = new Set<string>();
      let nodes: {
        id: string;
        label: string;
        type?: string;
        combo?: string;
        badge?: string | number;
      }[] = linkedNodes.map((node: INode) => {
        const link = $node.links?.find((l) => isSameResource(l.linkedTo, node));
        let combo = null;
        if (link?.tags?.length === 0) {
          combo = "no tag";
        } else {
          const linkTags = tags.filter((x) =>
            link?.tags?.some(resourceInList(x))
          );
          if (linkTags.length === 0) {
            combo = "no tag";
          } else if (linkTags.length === 1) {
            combo = linkTags[0].label;
          } else {
            // combo = linkTags[0].label;
            combo = linkTags.map((x) => x.label).join(", ");
          }
        }
        if (combo) {
          linkTagsInUse.add(combo);
        }
        return {
          id: node.id.toString(),
          label: resolveNodeLabel(node),
          combo
        };
      });
      nodes.push({
        id: $node.id.toString(),
        type: "hexagon",
        badge: $node.links?.length,
        label: $node.label ?? "",
        combo: undefined
      });

      let edges = $node.links?.map((l) => {
        return {
          source: $node.id.toString(),
          target: l.linkedTo.toString(),
          linkType: l.linkType
        };
      });

      const uniqueLinkTags = Array.from(linkTagsInUse);

      let combos = uniqueLinkTags
        .map((x) => {
          return {
            id: x,
            label: x
          };
        })
        .filter(Boolean);
      // combos = [
      //   ...combos,
      //   ...tagGroups.map((x) => ({
      //     id: x,
      //     label: x
      //   }))
      // ];
      if (depth > 1) {
        const remainingNodes = nodes
          .filter((x) => x.id !== $node.id.toString())
          .map((x) => x.id);
        const data = await fetchDepth(remainingNodes);
        if (!data.edges || data.edges.length === 0) return;
        edges?.push(...data.edges);
        nodes.push(...data.nodes);
        nodes = nodes.filter(removeDuplicatesFilter);
      }
      edges = edges
        ?.map((x) => {
          return {
            ...x,
            linkType:
              x.linkType === LinkType.DIRECT
                ? undefined
                : enumToString(x.linkType)
          };
        })
        .filter((x) => x);
      graphData = {
        nodes,
        edges,
        combos
      };
    }
  }

  export async function fetchDepth(nodes: IRecordId[]) {
    const properties = ["id", "in", "out", "linkType", "tags"];
    const inLinks = await linker.selectMany({
      properties,
      filters: {
        in: nodes.map((x) => x.toString())
      }
    });
    const outLinks = await linker.selectMany({
      properties,
      filters: {
        out: nodes.map((x) => x.toString())
      }
    });
    const edges = [...inLinks, ...outLinks]
      .filter(
        (link: any) =>
          link.in &&
          link.out &&
          link.in.toString().includes("node") &&
          link.out.toString().includes("node") &&
          !isSameResource(link.in, $node) &&
          !isSameResource(link.out, $node)
      )
      .map((link: any) => ({
        source: link.in.toString(),
        target: link.out.toString(),
        linkType: link.linkType
      }));
    const allNodesList = Array.from(
      new Set(edges.map((link: any) => [link.source, link.target]).flat())
    );
    let allNodes = await nodeStore.selectMany({
      properties: ["label", "body", "id"],
      filters: {
        id: allNodesList
      }
    });

    allNodes = allNodes.map((node: any) => {
      return {
        id: node.id.toString(),
        label: resolveNodeLabel(node)
      };
    });
    return { nodes: allNodes, edges };
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

  function closeRightPane() {
    isRightPanelCollapsed = true;
    rightPane = NodeRightPaneType.NONE;
  }
  function onNodeSelect(event: CustomEvent<string>) {
    appStore.openResource(event.detail, ResourceAccessMode.SPLIT);
  }
  // $: console.log({ links: $node.links, tags });
</script>

<div class="flex flex-col gap-3 w-full h-full p-3">
  <div
    class="flex w-full justify-between bg-bgs2 border border-brs3 rounded-md px-4 py-3"
  >
    <div class="flex items-center gap-4">
      {#if $view.isConstrainedWidth}
        <div class="w-32">
          <DropDown
            items={[
              {
                value: "Graph"
              },
              {
                value: "Fuzzy"
              },
              {
                value: "Serendipity"
              }
            ]}
            bind:value={selectedView}
            style={InputStyle.PLAIN}
            isDisableSearch={true}
          />
        </div>
      {:else}
        <PanelSwitcher
          items={["Graph", "Fuzzy", "Serendipity"]}
          size={Size.sm}
          style={PanelSwitcherStyle.TRAIN}
          bind:value={selectedView}
        />
      {/if}
      <Badge text="beta" />
    </div>
    <div class="flex tp:gap-8 2k:gap-12 items-center">
      <div class="flex gap-4 items-center">
        {#if !isAutoGrouping}
          <!-- <span class="text-b3 text-fgs3">
            Manual grouping will be available soon.</span
          > -->
          <!-- <div class="w-48">
            <DropDown
              items={groupOptions}
              isDisableSearch={true}
              isShowDividerForGroup={true}
              size={Size.sm}
              groups={[
                {
                  id: "Link tag groups",
                  label: "Link tag groups",
                  order: 0
                }
              ]}
            />
          </div>
          <div class="w-48">
            <DropDown
              items={subgroupOptions}
              isDisableSearch={true}
              isShowDividerForGroup={true}
              size={Size.sm}
              groups={[
                {
                  id: "Link tag groups",
                  label: "Link tag groups",
                  order: 0
                }
              ]}
            />
          </div> -->
        {/if}
        <!-- <div
          class="flex gap-2 items-center text-fgs2 text-b2 whitespace-nowrap"
        >
          <span>Manual</span>
          <Switch size={Size.sm} bind:on={isAutoGrouping} />
          <span>Auto grouping</span>
        </div> -->
      </div>
      <div class="w-32">
        <DropDown
          items={depthOptions}
          isDisableSearch={true}
          bind:value={depth}
          size={Size.sm}
          on:select={async () => {
            await refreshGraphData();
            graphRef?.rerender();
          }}
        />
      </div>
    </div>
  </div>
  <div class="flex w-full flex-1 min-h-0">
    <div class="flex-1 h-full">
      {#if selectedView === "Graph"}
        <NodeGraph
          bind:this={graphRef}
          data={graphData}
          nodeId={$node.id.toString()}
          on:select={onNodeSelect}
        />
      {:else}
        <ComingSoonView />
      {/if}
    </div>
    {#if !isMediaNode && mdId}
      <div class="flex gap-2 h-full overflow-auto">
        <NodeRightPane
          {node}
          {mdId}
          bind:isRightPanelCollapsed
          bind:pane={rightPane}
          on:close={closeRightPane}
        />
      </div>
    {/if}
  </div>
</div>
