<script lang="ts">
  import { mount, unmount } from "svelte";
  import PointMap from "@21n/ui/compositions/maps/PointMap.svelte";
  import type { MapPoint } from "@21n/ui/compositions/maps/map-point.type";
  import NodeMapItem from "./NodeMapItem.svelte";

  interface NodeMapPoint extends MapPoint {
    contentType: string;
    createdAt: string;
    url?: string;
    metadata: any;
  }

  let {
    data = [],
    isShowHeatmap = false
  }: {
    data?: NodeMapPoint[];
    isShowHeatmap?: boolean;
  } = $props();

  function renderPopup(target: HTMLElement, point: NodeMapPoint) {
    const instance = mount(NodeMapItem, { target, props: { data: point } });
    return () => {
      void unmount(instance);
    };
  }
</script>

<PointMap {data} {isShowHeatmap} {renderPopup} />
