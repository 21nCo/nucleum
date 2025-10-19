<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import MemotronOverviewLayout from "@21n/products/memotron/overview/MemotronOverviewLayout.svelte";
  import MapOverview from "@21n/components/overview/MapOverview.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { logger } from "@21n/components/debug/logger.client";
  import type { INode } from "@21n/products/memotron/node/node.type";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { Size } from "@21n/types/size.enum";

  interface MapDataPoint {
    id: string;
    label: string;
    latitude: number;
    longitude: number;
    contentType: string;
    createdAt: string;
    url?: string;
    metadata: any;
  }

  let mapData: MapDataPoint[] = [];
  let isLoading = false;
  let isConstrainedWidth = false;
  let isShowHeatmap = false;
  onMount(async () => {
    await fetchLocationData();
  });

  async function fetchLocationData() {
    isLoading = true;
    try {
      const allNodes = await nodeStore.selectMany();

      mapData = (allNodes || [])
        .filter((node: INode) => {
          return (
            node.metadata?.location?.latitude &&
            node.metadata?.location?.longitude
          );
        })
        .map((node: INode) => ({
          id: node.id.toString(),
          label: node.label || "Untitled",
          latitude: parseFloat(node.metadata.location.latitude),
          longitude: parseFloat(node.metadata.location.longitude),
          contentType: node.contentType,
          createdAt: node.createdAt,
          url: node.url,
          metadata: node.metadata
        }));
      logger.log({
        at: "MemotronMapOverview.fetchLocationData",
        nodesWithLocation: mapData.length,
        totalNodes: allNodes?.length || 0
      });
    } catch (error) {
      logger.error({ at: "MemotronMapOverview.fetchLocationData", error });
    } finally {
      isLoading = false;
    }
  }
</script>

<MemotronOverviewLayout bind:isConstrainedWidth>
  <span class="flex items-center gap-3 text-fgs3 text-b3 h-full" slot="right">
    {#if !isConstrainedWidth && mapData.length > 0}
      <!-- <span>
        {mapData.length} locations
      </span> -->
      <SwitchInput
        label={{ label: "Show as heatmap" }}
        size={Size.sm}
        bind:checked={isShowHeatmap}
      />
    {/if}
  </span>

  {#if isLoading}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      <EmptyStatusView isLoadingState={true} mainText="Loading map data..." />
    </div>
  {:else if mapData.length === 0}
    <div
      class="absolute z-10 inset-0 w-full h-full flex justify-center items-center bg-bgs1"
    >
      <EmptyStatusView
        mainText="No nodes with location data found."
        subText="Please make sure location permission is enabled while capturing a node."
      />
    </div>
  {:else}
    <div class="rounded-md overflow-hidden p-2 w-full h-full">
      <MapOverview data={mapData} {isShowHeatmap} />
    </div>
  {/if}
</MemotronOverviewLayout>
