<!--
  @component
  Retired app-level tabs strip that used to sit in the top bar: pinned tabs plus
  the interim tab of the resource opened through the `tab` search param.
  TIDY-484 retired app tabs and TIDY-487 moved existing tabs into the Pinned
  space, so nothing renders this component. It is kept for a future Nucleum
  ecosystem app that may bring tabs back.
-->
<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import Tabs from "@nucleum/shell/topNav/tabs/Tabs.svelte";
  import TopBarResourceItem from "@nucleum/shell/topNav/tabs/TopBarResourceItem.svelte";
  import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";

  let pinnedItems = $state<IRecordId[]>(tabs.get() ?? []);
  const currentTab = $derived($page.url.searchParams.get(AccessMode.TAB));
  const isInterimTab = $derived(
    !!currentTab && !pinnedItems.some((x) => x.toString() === currentTab)
  );

  onMount(() => {
    return uiState.subscribe(() => {
      queueMicrotask(() => {
        pinnedItems = tabs.get() ?? [];
      });
    });
  });
</script>

<div
  class="flex items-center justify-start relative h-full flex-grow overflow-x-auto"
>
  {#if pinnedItems.length > 0}
    <Tabs {pinnedItems} />
  {/if}
  {#if isInterimTab && currentTab}
    {#key currentTab}
      <TopBarResourceItem
        item={currentTab}
        onClick={() => {}}
        isInterimTab
        onClose={() => {
          navigation.goBack();
        }}
      />
    {/key}
  {/if}
</div>
