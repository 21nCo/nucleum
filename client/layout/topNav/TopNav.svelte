<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import ProfilePicture from "$lib/client/components/settings/account/ProfilePicture.svelte";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import Tabs from "./tabs/Tabs.svelte";
  import { tabs } from "./tabs/tabs.store";
  import TrailLeftIndicator from "./TrailLeftIndicator.svelte";
  import { fly } from "svelte/transition";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { page } from "$app/stores";
  import TopBarResourceItem from "./tabs/TopBarResourceItem.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  // import FocusPlayer from "$lib/client/products/pointron/focus/player/FocusPlayer.svelte";
  let isInFocusMode = false;
  let pinnedItems: IRecordId[] = tabs.get() ?? [];

  $: currentTab = $page.url.searchParams.get(ResourceAccessMode.TAB);
  $: isInterimTab =
    currentTab && !pinnedItems.some((x) => x.toString() === currentTab);

  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }

  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get() ?? [];
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
</script>

{#if !isInFocusMode}
  <div
    class={cn(
      "w-full h-11 max-h-11 min-h-11 bg-bgs2 pr-4 border-b border-brs3 userdata",
      {
        "flex gap-3 justify-between items-center":
          pinnedItems.length > 0 || isInterimTab,
        "grid grid-cols-3": pinnedItems.length === 0 && !isInterimTab
      }
    )}
  >
    {#if pinnedItems.length > 0}
      <div class="relative h-full overflow-x-auto">
        <Tabs {pinnedItems} />
        <div
          class="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none"
        >
          <div
            class="h-full w-6 flex items-center justify-end bg-gradient-to-r from-transparent via-bgs2/50 to-bgs2 px-2"
          ></div>
        </div>
      </div>
    {:else}
      <div class="w-1 h-full"></div>
    {/if}
    {#if pinnedItems.length === 0 && !isInterimTab}
      <div class="flex items-center justify-center">
        <button
          class="flex items-center justify-between w-96 bg-bgs3 hover:bg-bgs4 rounded-full px-3 py-1 mx-3 text-b2 text-fgs2"
          transition:fly={{
            duration: 300,
            x: 40
          }}
          on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
        >
          <span>Search</span>
          <ShortcutText shortcut={Action.GLOBAL_SEARCH} parentBgIndex={2} />
        </button>
      </div>
    {/if}
    <div class="flex items-center justify-end gap-3">
      {#if isInterimTab && currentTab}
        {#key currentTab}
          <TopBarResourceItem
            item={currentTab}
            on:click
            isInterimTab
            on:close={() => {
              appStore.gotoPath("/");
            }}
          />
        {/key}
      {/if}
      {#if pinnedItems.length > 0 || isInterimTab}
        <div
          transition:fly={{
            duration: 300,
            x: -60
          }}
        >
          <Button
            icon="ph:magnifying-glass"
            tooltip="Search"
            style={ButtonStyle.PLAIN}
            parentBgIndex={2}
            on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
          />
        </div>
      {/if}
      <Button
        icon="ph:terminal"
        tooltip="Command bar"
        style={ButtonStyle.PLAIN}
        parentBgIndex={2}
        on:click={() => appStore.runAction(Action.CMD)}
      />
      <Button
        icon="ph:question"
        tooltip="Help"
        style={ButtonStyle.PLAIN}
        parentBgIndex={2}
        on:click={() => appStore.runAction(Action.HELP)}
      />
      <!-- <FocusPlayer /> -->
      <TrailLeftIndicator />
      <button
        class="flex items-center gap-2"
        on:click={() => appStore.runAction(Action.SETTINGS)}
      >
        <ProfilePicture context="topbar" />
      </button>
    </div>
  </div>
{/if}
<svelte:window on:focusMode={handleFocusMode} />
