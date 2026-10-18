<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import LeftNav from "@nucleum/shell/leftPanel/LeftNav.svelte";
  import ProfileLeftPanelSection from "@nucleum/surfaces/account/profile/ProfileLeftPanelSection.svelte";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";
  import NativeCaptureControl from "@nucleum/composition/chrome/NativeCaptureControl.svelte";
  import ConnectedLeftNavOfflineStatus from "./ConnectedLeftNavOfflineStatus.svelte";

  let {
    variant = "expandable",
    isHidePanel = false
  }: {
    variant?: "fixed" | "expandable";
    isHidePanel?: boolean;
  } = $props();
</script>

{#snippet profileSection()}
  <ProfileLeftPanelSection />
{/snippet}
{#snippet offlineStatus({ isIconOnly }: { isIconOnly?: boolean })}
  <OfflineStatusIndicator {isIconOnly} />
{/snippet}
{#snippet expandableOfflineStatus(isInThinMode: boolean)}
  <ConnectedLeftNavOfflineStatus {isInThinMode} />
{/snippet}
{#snippet capture()}
  <NativeCaptureControl />
{/snippet}

<LeftNav {variant} {isHidePanel} {profileSection} {offlineStatus} {expandableOfflineStatus} {capture} />
