<script lang="ts">
  import {
    isSameResource,
    removeDuplicatesFilter,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import {
    PanelSwitcherActiveItemStrength,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import NodeGraph from "@21n/products/memotron/graph/NodeGraph.svelte";
  import {
    linker,
    linkTagStore
  } from "@21n/products/memotron/linking/link.store";
  import { linkTagLabelMapper } from "@21n/products/memotron/linking/link.utils";
  import {
    nodeStore,
    type IActiveNodeStore
  } from "@21n/products/memotron/node/node.store";
  import {
    NodeView,
    webNodeTypeList,
    type INode,
    type INodeLinkThumb,
    type INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import type { DropdownItem } from "@21n/types/dropdownItem.type";
  import {
    LinkType,
    type ILinkTag
  } from "@21n/products/memotron/linking/link.type";
  import { enumToString } from "@21n/shared-utils/text.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import view from "@21n/stores/view.store";
  import { InputStyle } from "@21n/types/input.type";
  import {
    resolveNodeFavicon,
    resolveNodeGraphFill,
    resolveNodeLabelString
  } from "@21n/products/memotron/node/node.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import NodeRightPaneContent from "@21n/products/memotron/node/rightPanel/NodeRightPaneContent.svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import NodeTimelineView from "@21n/products/memotron/node/timeline/NodeTimelineView.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { NodeBirdViewMode } from "@21n/products/memotron/node/birdView/birdView.type";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  export let node: IActiveNodeStore;
  let linkedNodes: INode[];
  let selectedView = NodeBirdViewMode.Graph;
  let depth = $page.url?.searchParams?.get(AppSearchParam.DEPTH)
    ? parseInt($page.url?.searchParams?.get(AppSearchParam.DEPTH) ?? "1")
    : 1;
  let graphRef: NodeGraph;
  let isAutoGrouping = true;
  let isTraverseMode =
    $page.url?.searchParams?.get(AppSearchParam.TRAVERSE) === "true";
  type GraphNode = {
    id: string;
    label: string;
    type?: string;
    combo?: string;
    badge?: string | number;
    icon?: string;
    fill?: string;
  };
  type GraphEdge = {
    source: string;
    target: string;
    id?: IRecordId;
    linkType?: LinkType | string;
  };
  type GraphCombo = {
    id: string;
    label: string;
  };
  let combos: GraphCombo[] = [];
  let graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    combos: GraphCombo[];
  } = { nodes: [], edges: [], combos: [] };
  let splitResource: IRecordId | undefined = undefined;
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
    try {
      if ($linkTagStore) {
        tags =
          $linkTagStore
            .filter((x) =>
              $node.links?.some((y) => y.tags?.some(resourceInList(x)))
            )
            ?.map(linkTagLabelMapper) ?? [];
        tagGroups = Array.from(
          new Set(tags?.map((x) => x.group ?? "No group"))
        );
      }

      let commonGroupOptions = [
        { label: "Link tags", value: "linktags" },
        { label: "Link types", value: "linktypes" },
        ...(tagGroups?.map((x) => ({
          label: x,
          value: x,
          groupId: "Link tag groups"
        })) ?? [])
      ];

      groupOptions = [
        { label: "Group by: None", value: "none" },
        ...commonGroupOptions
      ];
      subgroupOptions = [
        { label: "Subgroup by: None", value: "none" },
        ...commonGroupOptions
      ];
    } catch (error) {
      logger.error({ at: "initializeConfig", error });
    }
  }

  async function loadLinkedNodesData(links: INodeLinkThumb[]) {
    try {
      linkedNodes = await nodeStore.selectMany({
        properties: {
          select: ["id", "label", "body", "contentType", "metadata", "url"],
          expand: ["parent"]
        },
        filters: {
          id: links.map((x) => x.linkedTo.toString())
        }
      });
    } catch (error) {
      logger.error({ at: "loadLinkedNodesData", error });
    }
  }

  /**
   * TODO - filters
   *
   * Note: removed no relation category altogether since this is not looking visually appealing when no other link tags are present. Even if other link tags are present, not having `no relation` category is not looking visually appealing.
   */
  async function refreshGraphData(
    links: INodeLinkThumb[] | undefined,
    depth: number
  ) {
    try {
      const activeNode = $node;
      const activeLinks = links ?? [];
      if (activeLinks.length === 0) {
        graphData = { nodes: [], edges: [], combos: [] };
        return;
      }
      await loadLinkedNodesData(activeLinks);
      if (isAutoGrouping) {
        let linkTagsInUse = new Set<string>();
        let nodes: GraphNode[] = linkedNodes.map((linkedNode: INode) => {
          const link = activeLinks.find((l) =>
            isSameResource(l.linkedTo, linkedNode)
          );
          let combo = null;
          if (link?.tags?.length === 0) {
            // combo = "no relation";
          } else {
            const linkTags = tags.filter((x) =>
              link?.tags?.some(resourceInList(x))
            );
            if (linkTags.length === 0) {
              // combo = "no relation";
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
            id: linkedNode.id.toString(),
            label: resolveNodeLabelString(linkedNode as INodeThumb),
            icon: webNodeTypeList.includes(linkedNode.contentType)
              ? resolveNodeFavicon(linkedNode)
              : undefined,
            fill: resolveNodeGraphFill(linkedNode),
            combo: combo ?? undefined
          };
        });
        nodes.push({
          id: activeNode.id.toString(),
          type: "hexagon",
          badge: activeLinks.length,
          label: resolveNodeLabelString(activeNode as INodeThumb),
          icon: webNodeTypeList.includes(activeNode.contentType)
            ? resolveNodeFavicon(activeNode)
            : undefined,
          fill: resolveNodeGraphFill(activeNode),
          combo: undefined
        });

        let edges: GraphEdge[] = activeLinks.map((l) => {
          return {
            source: activeNode.id.toString(),
            target: l.linkedTo.toString(),
            id: l.links?.[0]?.id,
            linkType: l.linkType
          };
        });

        const uniqueLinkTags = Array.from(linkTagsInUse);

        combos = uniqueLinkTags
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
            .filter((x) => x.id !== activeNode.id.toString())
            .map((x) => x.id);
          const data = await fetchDepth(remainingNodes);
          if (!data.edges || data.edges.length === 0) return;
          edges.push(...data.edges);
          nodes.push(...data.nodes);
          nodes = nodes.filter(removeDuplicatesFilter).map((x) => {
            return {
              ...x,
              combo: depth === 1 ? x.combo : undefined
            };
          });
        }
        edges = edges
          .map((x) => {
            return {
              ...x,
              linkType:
                x.linkType === LinkType.DIRECT
                  ? undefined
                  : enumToString(x.linkType)
            };
          })
          .filter(removeDuplicatesFilter)
          .filter((x, index) => {
            return (
              x.source &&
              x.target &&
              nodes.some((y) => y.id === x.source) &&
              nodes.some((y) => y.id === x.target) &&
              edges.findIndex(
                (y) => y.source === x.source && y.target === x.target
              ) === index
            );
          });
        graphData = {
          nodes,
          edges,
          combos: depth === 1 ? combos : []
        };
      }
    } catch (error) {
      logger.error({ at: "refreshGraphData", error });
      toasts.error("Something went wrong. Please try again later.");
    }
  }

  export async function fetchDepth(nodes: IRecordId[]) {
    const activeNode = $node;
    const linkProperties = {
      select: ["id", "in", "out", "linkType", "tags"]
    };
    const inLinks = await linker.selectMany({
      properties: linkProperties,
      filters: {
        in: nodes.map((x) => x.toString())
      }
    });
    const outLinks = await linker.selectMany({
      properties: linkProperties,
      filters: {
        out: nodes.map((x) => x.toString())
      }
    });
    const edges: GraphEdge[] = [...inLinks, ...outLinks]
      .filter(
        (link: any) =>
          link.in &&
          link.out &&
          link.in.toString().includes("node") &&
          link.out.toString().includes("node") &&
          !isSameResource(link.in, activeNode) &&
          !isSameResource(link.out, activeNode)
      )
      .map((link: any) => ({
        source: link.in.toString(),
        target: link.out.toString(),
        id: link.id,
        linkType: link.linkType
      }));
    const allNodesList = Array.from(
      new Set(edges.map((link: any) => [link.source, link.target]).flat())
    );
    let allNodes: GraphNode[] = await nodeStore.selectMany({
      properties: {
        select: ["id", "label", "body", "contentType"],
        expand: ["parent"]
      },
      filters: {
        id: allNodesList
      }
    });

    allNodes = allNodes.map((node: any) => {
      return {
        id: node.id.toString(),
        label: resolveNodeLabelString(node as INodeThumb)
      };
    });
    return { nodes: allNodes, edges };
  }

  async function onNodeSelect(e: CustomEvent) {
    const event = e.detail;
    const newResource = event.target.id;
    logger.log({ at: "onNodeSelect", event, newResource, splitResource });
    if (!newResource) return;

    if (
      isTraverseMode &&
      !event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      appStore.resourceClickHandler(undefined, newResource, {
        replaceId: $node.id.toString(),
        searchParams: {
          [appStore.resolveRecordSpecificSearchParam(
            newResource,
            AppSearchParam.NODE_VIEW
          )]: NodeView.BIRD,
          [AppSearchParam.DEPTH]: depth,
          [AppSearchParam.TRAVERSE]: isTraverseMode
        }
      });
      return;
    }

    if (newResource === $node.id.toString()) {
      if ($node.panel === ResourcePanelType.LINKS)
        node.switchPanel(ResourcePanelType.DEFAULT);
      else node.switchPanel(ResourcePanelType.LINKS);
      return;
    }
    if (splitResource === newResource) {
      closeSplitResource();
      return;
    }
    splitResource = newResource;
    appStore.resourceClickHandlerForGraph(newResource, event, {
      replaceId: $node.id
    });
  }

  function closeSplitResource() {
    if (!splitResource) return;
    appStore.closeResource({ id: splitResource });
    splitResource = undefined;
  }
</script>

<div class="flex flex-col gap-3 w-full flex-grow">
  <div class="flex w-full justify-between bg-bgs2 p-2">
    <div class="flex items-center gap-4">
      {#if $view.isConstrainedWidth}
        <div class="w-32">
          <DropDown
            items={[
              {
                value: NodeBirdViewMode.Graph,
                label: "Graph",
                icon: "graph"
              },
              {
                value: NodeBirdViewMode.Timeline,
                label: "Timeline",
                icon: "mynaui:git-merge"
              },
              {
                value: NodeBirdViewMode.Serendipity,
                label: "Serendipity",
                icon: "sparkle"
              }
            ]}
            bind:value={selectedView}
            style={InputStyle.PLAIN}
            isDisableSearch={true}
          />
        </div>
      {:else}
        <PanelSwitcher
          items={[
            {
              value: NodeBirdViewMode.Graph,
              label: "Graph",
              icon: "graph"
            },
            {
              value: NodeBirdViewMode.Timeline,
              label: "Timeline",
              icon: "mynaui:git-merge"
            }
            // {
            //   value: NodeBirdViewMode.Serendipity,
            //   label: "Serendipity",
            //   icon: "sparkle"
            // }
          ]}
          style={PanelSwitcherStyle.TRAIN}
          activeItemStrength={PanelSwitcherActiveItemStrength.STRONG}
          bind:value={selectedView}
        />
      {/if}
    </div>
    <div class="flex tp:gap-6 2k:gap-8 items-center">
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
      {#if selectedView === NodeBirdViewMode.Graph}
        <div class="min-w-fit">
          <DropDown
            items={depthOptions}
            isDisableSearch={true}
            value={depth}
            size={Size.sm}
            on:select={async (e) => {
              depth = e.detail;
              appStore.toggleSearchParam({
                [AppSearchParam.DEPTH]: depth
              });
              await refreshGraphData($node.links, depth);
              graphRef?.rerender();
            }}
          />
        </div>
      {/if}
      <div class="flex gap-2 items-center">
        {#if selectedView === NodeBirdViewMode.Graph}
          <Toggle
            icon="traverse"
            tooltip={isTraverseMode
              ? "Switch to normal mode"
              : "Switch to traverse mode"}
            parentBgIndex={2}
            on={isTraverseMode}
            on:change={(e) => {
              isTraverseMode = e.detail;
              appStore.toggleSearchParam({
                [AppSearchParam.TRAVERSE]: isTraverseMode
              });
              setTimeout(() => {
                graphRef?.rerender();
              }, 100);
            }}
          />
        {/if}
        <Toggle
          icon="link"
          tooltip="See all links"
          parentBgIndex={2}
          on:change={(e) => {
            if (e.detail) {
              node.switchPanel(ResourcePanelType.LINKS);
            } else if ($node.panel === ResourcePanelType.LINKS) {
              node.switchPanel(ResourcePanelType.DEFAULT);
            }
          }}
        />
      </div>
    </div>
  </div>
  <div class="flex w-full flex-1 min-h-0">
    <div class="flex-1 h-full min-w-0">
      {#if selectedView === NodeBirdViewMode.Graph}
        {#await refreshGraphData($node.links, depth)}
          <div class="flex-1 h-full min-w-0">
            <EmptyStatusView isLoadingState={true} />
          </div>
        {:then}
          <NodeGraph
            bind:this={graphRef}
            layout={depth === 1 && !isTraverseMode
              ? "dendrogram-1"
              : "radial-2"}
            data={graphData}
            nodeId={$node.id.toString()}
            on:select={onNodeSelect}
            on:canvasClick={closeSplitResource}
          />
        {/await}
      {:else if selectedView === NodeBirdViewMode.Timeline}
        <NodeTimelineView node={$node} />
      {:else}
        <ComingSoonView
          mainText="Coming soon"
          subText="Serendipity shows unlinked nodes relevant to the current node."
        />
      {/if}
    </div>
    {#if $node.panel && $node.panel !== ResourcePanelType.NONE}
      <div
        class="flex gap-2 h-full overflow-auto min-w-96 max-w-96 border-l border-brs3"
      >
        <NodeRightPaneContent {node} />
      </div>
    {/if}
  </div>
</div>
