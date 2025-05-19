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
  // import FocusPlayer from "$lib/client/products/pointron/focus/player/FocusPlayer.svelte";
  let isInFocusMode = false;
  let pinnedItems: IRecordId[] = tabs.get() ?? [];

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
    class="flex gap-3 justify-between items-center w-full h-11 max-h-11 min-h-11 bg-bgs2 pr-4 border-b border-brs3 userdata"
  >
    <Tabs {pinnedItems} />
    {#if pinnedItems.length < 1}
      <button
        class="flex items-center justify-between w-96 bg-bgs3 hover:bg-bgs4 rounded-full px-3 py-1 text-b2 text-fgs2"
        transition:fly={{
          duration: 300,
          x: 40
        }}
        on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
      >
        <span>Search</span>
        <ShortcutText shortcut={Action.GLOBAL_SEARCH} parentBgIndex={2} />
      </button>
    {/if}
    <div class="flex items-center gap-3">
      {#if pinnedItems.length > 0}
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
