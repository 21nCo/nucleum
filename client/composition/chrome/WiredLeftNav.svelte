<svelte:options runes={true} />

<script lang="ts">
  import LeftNav from "@nucleum/shell/leftPanel/LeftNav.svelte";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";

  let {
    isHidePanel = false
  }: {
    isHidePanel?: boolean;
  } = $props();
</script>

{#snippet offlineStatus({ isIconOnly }: { isIconOnly?: boolean })}
  <OfflineStatusIndicator {isIconOnly} />
{/snippet}

<LeftNav {isHidePanel} {offlineStatus} />
