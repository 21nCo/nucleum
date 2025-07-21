<script lang="ts">
  import { TimeScale } from "$lib/client/types/time.type";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { linker } from "$lib/client/products/memotron/linking/link.store";
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeThumbnail from "$lib/client/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import MetricCard from "$lib/client/components/calendar/column/overview/MetricCard.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import type { ILink } from "$lib/client/products/memotron/linking/link.type";

  export let date: Date;
  export let scale: TimeScale = TimeScale.DAYS;
  export let isRewind: boolean = false;

  async function fetchMemoryData(): Promise<{
    today: { nodes: INodeThumb[]; links: ILink[] };
    previousYears: { nodes: INodeThumb[]; links: ILink[]; year: number }[];
  }> {
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const [todayNodesResult, todayLinksResult] = await Promise.all([
      nodeStore.selectMany(
        {
          filters: {
            createdAt: normalizedDate
          },
          orderBy: {
            createdAt: "desc"
          },
          limit: 50
        },
        {
          isExpand: true
        }
      ),
      linker.selectMany({
        filters: {
          createdAt: normalizedDate
        },
        orderBy: {
          createdAt: "desc"
        },
        limit: 20
      })
    ]);

    const previousYearsResults = [];
    for (let yearsAgo = 1; yearsAgo <= 3; yearsAgo++) {
      const memoryDate = new Date(
        date.getFullYear() - yearsAgo,
        date.getMonth(),
        date.getDate()
      );

      if (memoryDate > new Date()) continue;

      const [nodesResult, linksResult] = await Promise.all([
        nodeStore.selectMany(
          {
            filters: {
              createdAt: memoryDate
            },
            orderBy: {
              createdAt: "desc"
            },
            limit: 10
          },
          {
            isExpand: true
          }
        ),
        linker.selectMany({
          filters: {
            createdAt: memoryDate
          },
          orderBy: {
            createdAt: "desc"
          },
          limit: 5
        })
      ]);

      if (nodesResult?.length > 0 || linksResult?.length > 0) {
        previousYearsResults.push({
          nodes: (nodesResult || []) as INodeThumb[],
          links: linksResult || [],
          year: memoryDate.getFullYear()
        });
      }
    }

    return {
      today: {
        nodes: (todayNodesResult || []) as INodeThumb[],
        links: todayLinksResult || []
      },
      previousYears: previousYearsResults
    };
  }

  function handleNodeClick(node: INodeThumb) {
    appStore.openResource(node.id, ResourceAccessMode.POP);
  }
</script>

{#await fetchMemoryData()}
  <EmptyStatusView
    isLoadingState={true}
    mainText="Loading memories..."
    loadingAnimation={LoadingAnimationType.OVERVIEW_CARDS_PULSE}
  />
{:then { today, previousYears }}
  {#if today.nodes.length === 0 && today.links.length === 0 && previousYears.length === 0}
    <EmptyStatusView
      mainText="No nodes found"
      subText={`No nodes found on ${formatDate(date, "verbose")}`}
    />
  {:else}
    <div class="flex flex-col gap-6 w-full">
      <!-- Today's Memory metrics cards -->
      <div
        class="w-full flex flex-wrap justify-start items-start content-start dp:gap-4 gap-3"
      >
        <MetricCard
          label="Nodes"
          value={today.nodes.length}
          isAccent={true}
          callback={() => {
            appStore.openResource(Action.HISTORY, ResourceAccessMode.POP, {
              searchParams: { [AppSearchParam.DATE]: date.toISOString() }
            });
          }}
        />
        <MetricCard label="Links" value={today.links.length} />
      </div>

      <div class="flex flex-col gap-3 w-full">
        <Text content="On this day" style={TextStyle.SECTION_HEADING} />
        {#if previousYears.length > 0}
          {#each previousYears as { nodes, links, year }}
            <div class="flex flex-col gap-2 w-full">
              <!-- Year header -->
              <div class="text-fgs2 text-b2">
                {year} ({new Date().getFullYear() - year} year{new Date().getFullYear() -
                  year >
                1
                  ? "s"
                  : ""} ago)
              </div>

              {#if nodes.length > 0}
                <!-- Memories List using NodeThumbnail -->
                <div class="flex flex-col gap-2 w-full">
                  {#each nodes.slice(0, 3) as node (node.id)}
                    <NodeThumbnail
                      item={node}
                      arrangement={Arrangement.LIST}
                      accessPoint={ResourceAccessPoint.CALENDAR}
                      accessPointId={`calendar-${date.toISOString().split("T")[0]}`}
                      on:click={() => handleNodeClick(node)}
                    />
                  {/each}

                  {#if nodes.length > 3}
                    <div class="text-center py-1">
                      <div class="text-fgs3 text-b3">
                        and {nodes.length - 3} more memories from {year}...
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        {:else}
          <EmptyStatusView
            mainText="No memories found"
            subText={`No memories found for this day in previous years`}
          />
        {/if}
      </div>
    </div>
  {/if}
{:catch error}
  <EmptyStatusView
    mainText="Failed to load memory data"
    subText={error?.message || "An error occurred"}
  />
{/await}
