<script lang="ts">
  import { onMount } from "svelte";
  import { nodeStore } from "../node/node.store";
  import MemotronOverviewLayout from "./MemotronOverviewLayout.svelte";
  import MapOverview from "$lib/client/components/overview/MapOverview.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import type { INode } from "../node/node.type";

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

  onMount(async () => {
    await fetchLocationData();
  });

  async function fetchLocationData() {
    isLoading = true;
    try {
      const allNodes = await nodeStore.selectMany({
        properties: ["*", "metadata"]
      });

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
      <span>
        {mapData.length} locations
      </span>
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
    <div class="rounded-md overflow-hidden mt-1 w-full h-full">
      <MapOverview data={mapData} />
    </div>
  {/if}
</MemotronOverviewLayout>
