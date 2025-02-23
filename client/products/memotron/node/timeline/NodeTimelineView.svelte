<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node.store";
  import type { INode, INodeLinkThumb, INodeThumb } from "../node.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { resolveNodeLabelString } from "../node.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { appStore } from "$lib/client/stores/app.store";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";

  export let node: INode;
  let isLoading = false;
  let linkedNodes: INodeThumb[] = [];
  let groups: { date: string; nodes: INodeThumb[] }[] = [];

  onMount(async () => {
    await loadTimelineData();
  });

  async function loadTimelineData() {
    try {
      isLoading = true;
      if (!node.links?.length) {
        linkedNodes = [];
        return;
      }

      linkedNodes = await nodeStore.selectMany({
        properties: [
          "id",
          "label",
          "parent.* as parent",
          "body",
          "contentType",
          "metadata",
          "url",
          "createdAt"
        ],
        filters: {
          id: node.links.map((x: INodeLinkThumb) => x.linkedTo.toString())
        }
      });
      linkedNodes.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      groups = groupNodesByDate(linkedNodes);
    } catch (error) {
      logger.error({ at: "loadTimelineData", error });
    } finally {
      isLoading = false;
    }
  }

  function groupNodesByDate(nodes: INodeThumb[]) {
    const groups = new Map<string, INodeThumb[]>();

    nodes.forEach((node) => {
      const date = formatDate(new Date(node.createdAt));
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)?.push(node);
    });

    return Array.from(groups.entries()).map(([date, nodes]) => ({
      date,
      nodes
    }));
  }

  function handleNodeClick(nodeId: string, event: MouseEvent) {
    appStore.resourceClickHandlerForGraph(nodeId, event, {
      replaceId: node.id
    });
  }
</script>

<div class="flex flex-col w-full h-full overflow-auto px-4 dp:px-12">
  {#if isLoading}
    <EmptyStatusView
      size={Size.sm}
      isLoadingState={true}
      mainText="Loading timeline"
      subText="Please wait while we load the timeline data"
    />
  {:else if isValidArrayWithData(linkedNodes)}
    <div class="flex flex-col gap-8 relative pl-6">
      <div class="absolute left-[6px] -top-2 bottom-0 w-[2px] bg-bgs4" />
      {#each groups as group, index}
        {#if index === 0}
          <ScrollViewBottomSpacer size={Size.sm} />
        {/if}
        <div class="flex gap-4 items-start relative">
          <div class="absolute -left-[23px] top-0 flex items-center h-[24px]">
            <div class="w-[8px] h-[8px] rounded-full bg-fgs3" />
          </div>
          <div class="flex flex-col gap-1.5 flex-grow">
            <div class="text-b3 text-fgs3 h-[24px] flex items-center">
              {group.date}
            </div>
            <div class="flex flex-col gap-2">
              {#each group.nodes as linkedNode}
                {@const link = node.links?.find((l) =>
                  isSameResource(l.linkedTo, linkedNode)
                )}
                <button
                  class="flex flex-col gap-1 p-3 rounded-md bg-bgs2 hover:bg-bgs3 border border-brs3 text-left w-full"
                  on:click={(e) => handleNodeClick(linkedNode.id.toString(), e)}
                >
                  <div class="text-b2 text-fgs1">
                    {resolveNodeLabelString(linkedNode)}
                  </div>
                  {#if link?.tags?.length}
                    <div class="flex gap-2">
                      {#each link.tags as tag}
                        <span
                          class="text-b3 text-fgs3 bg-bgs3 px-2 py-0.5 rounded"
                        >
                          {tag.label}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
        {#if index === groups.length - 1}
          <ScrollViewBottomSpacer size={Size.xl} />
        {/if}
      {/each}
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      mainText="No linked nodes"
      subText="This node has no linked nodes to display in the timeline"
    />
  {/if}
</div>
