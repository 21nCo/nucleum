<script lang="ts">
  import { nucleumDatafnStatus } from "@nucleum/datafn/datafn.store";
  import type { Resource } from "@nucleum/datafn/resource.enum";
  import InlineSyncingFeedbackBase from "@21n/ui/elements/feedback/InlineSyncingFeedbackBase.svelte";
  import { derived } from "svelte/store";
  import { delayedSyncVisibility } from "@nucleum/shell/sync/sync-visibility";

  let {
    resource,
    isShorter = false,
    text = undefined,
    padding = "",
    isDisableOutTransition = false
  }: {
    resource: Resource;
    isShorter?: boolean;
    text?: string | undefined;
    padding?: string;
    isDisableOutTransition?: boolean;
  } = $props();

  let currentResource = $state(resource);
  const isSlowSync = delayedSyncVisibility(
    derived(
      nucleumDatafnStatus,
      ($status) => $status.status === "syncing" || $status.status === "starting"
    )
  );
  const isSyncing = $derived(Boolean(currentResource) && $isSlowSync);

  $effect(() => {
    currentResource = resource;
  });

  export function refresh(resourceParam?: Resource) {
    currentResource = resourceParam ?? resource;
  }
</script>

<InlineSyncingFeedbackBase
  {isShorter}
  {text}
  {padding}
  {isSyncing}
  {isDisableOutTransition}
/>
