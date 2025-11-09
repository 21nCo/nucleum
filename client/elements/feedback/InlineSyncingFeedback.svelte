<script lang="ts">
  import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import SyncStatusListener from "@21n/elements/listeners/SyncStatusListener.svelte";
  import InlineSyncingFeedbackBase from "@21n/elements/feedback/InlineSyncingFeedbackBase.svelte";

  export let resource: Resource;
  export let isShorter: boolean = false;
  export let text: string | undefined = undefined;
  export let padding: string = "";
  export let isDisableOutTransition: boolean = false;
  let isSyncing: boolean = false;
  let syncStatusPropagatorRef: SyncStatusListener | null = null;

  export function refresh(resourceParam?: Resource) {
    syncStatusPropagatorRef?.refresh(resourceParam);
  }
</script>

<InlineSyncingFeedbackBase
  {isShorter}
  {text}
  {padding}
  {isSyncing}
  {isDisableOutTransition}
/>
<SyncStatusListener
  bind:this={syncStatusPropagatorRef}
  {resource}
  bind:isSyncing
/>
