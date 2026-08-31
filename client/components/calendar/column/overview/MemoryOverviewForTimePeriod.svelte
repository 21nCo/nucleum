<script lang="ts">
  import { TimeScaleUnit } from "@21n/types/time.type";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { appStore } from "@21n/stores/app.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { Arrangement } from "@21n/types/direction.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import MetricCard from "@21n/components/calendar/column/overview/MetricCard.svelte";
  import { Action } from "@21n/types/action.enum";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import type { ILink } from "@21n/products/memotron/linking/link.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { Size } from "@21n/types/size.enum";

  let {
    date,
    scale = TimeScaleUnit.DAY,
    isRewind = false
  }: {
    date: Date;
    scale?: TimeScaleUnit;
    isRewind?: boolean;
  } = $props();

  const dev_isShowPreviousYearsData = false;

  async function fetchMemoryData(): Promise<{
    today: { nodes: INodeThumb[]; links: ILink[] };
    previousYears: { nodes: INodeThumb[]; links: ILink[]; year: number }[];
  }> {
    const dateFilter = tzStore.resolveTimePeriodFilter(date, {
      scale,
      isReturnAsDateObjectFilter: true
    });
    const legacyDateFilter = {
      greaterThanOrEqual: dateFilter.$gte,
      lessThanOrEqual: dateFilter.$lte
    };
    const [todayNodesResult, todayLinksResult] = await Promise.all([
      nodeStore.selectMany(
        {
          filters: {
            createdAt: legacyDateFilter
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
          createdAt: legacyDateFilter
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
      const dateFilterForMemoryDate = tzStore.resolveTimePeriodFilter(
        memoryDate,
        {
          scale,
          isReturnAsDateObjectFilter: true
        }
      );
      const legacyDateFilterForMemoryDate = {
        greaterThanOrEqual: dateFilterForMemoryDate.$gte,
        lessThanOrEqual: dateFilterForMemoryDate.$lte
      };

      if (memoryDate > new Date()) continue;

      const [nodesResult, linksResult] = await Promise.all([
        nodeStore.selectMany(
          {
            filters: {
              createdAt: legacyDateFilterForMemoryDate
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
            createdAt: legacyDateFilterForMemoryDate
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
    appStore.openResource(node.id, AccessMode.POP);
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
    <!-- <EmptyStatusView
      mainText="No nodes found"
      subText={`No nodes found on ${parseAndFormatDate(date, "verbose")}`}
    /> -->
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
            appStore.openResource(Action.HISTORY, AccessMode.POP, {
              searchParams: { [AppSearchParam.DATE]: date.toISOString() }
            });
          }}
        />
        <MetricCard label="Links" value={today.links.length} />
      </div>
      {#if dev_isShowPreviousYearsData && previousYears.length > 0}
        <div class="flex flex-col gap-3 w-full">
          <Text content="On this day" style={TextStyle.SECTION_HEADING} />
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
                      onClick={() => handleNodeClick(node)}
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
        </div>
      {/if}
    </div>
  {/if}
{:catch error}
  <EmptyStatusView
    mainText="Failed to load memory data"
    subText={error?.message || "An error occurred"}
  />
{/await}
