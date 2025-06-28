<script lang="ts">
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import SyncStatusPropagator from "./SyncStatusPropagator.svelte";
  import InlineSyncingFeedbackBase from "./InlineSyncingFeedbackBase.svelte";

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

<InlineSyncingFeedbackBase {isFullWidthVariant} {text} {padding} {isSyncing} />
<SyncStatusPropagator
  bind:this={syncStatusPropagatorRef}
  {resource}
  bind:isSyncing
/>
