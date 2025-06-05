<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { easeBounceIn } from "d3";
  import Icon from "../Icon.svelte";
  import { scale } from "svelte/transition";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import SyncStatusPropagator from "./SyncStatusPropagator.svelte";

  export let resource: Resource;
  export let isFullWidthVariant: boolean = false;
  export let text: string = "Syncing...";
  export let padding: string = "";
  let isSyncing: boolean = false;
  let syncStatusPropagatorRef: SyncStatusPropagator | null = null;

  export function refresh(resourceParam?: Resource) {
    syncStatusPropagatorRef?.refresh(resourceParam);
  }
</script>

<span
  class={cn("flex items-center gap-2 text-aps1", padding, {
    "w-full justify-center py-2 bg-aps3 rounded-md": isFullWidthVariant
  })}
  class:hidden={!isSyncing}
  in:scale={{ duration: 200, easing: easeBounceIn }}
>
  <Icon
    icon={isFullWidthVariant
      ? "svg-spinners:3-dots-fade"
      : "svg-spinners:eclipse-half"}
    size={Size.xs}
    class="text-aps1"
  />
  <span class="text-b3"> {text} </span>
</span>

<SyncStatusPropagator
  bind:this={syncStatusPropagatorRef}
  {resource}
  bind:isSyncing
/>
