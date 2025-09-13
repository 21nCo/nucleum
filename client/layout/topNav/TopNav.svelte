<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
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
  import { determineIfActiveSubscriber } from "$lib/client/components/subscription/userPlan.utils";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { tooltip } from "$lib/client/actions/popover.action";
  import TopNavLeftMenuItem from "./TopNavLeftMenuItem.svelte";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import TopNavLeftLogo from "./TopNavLeftLogo.svelte";
  import { Embed } from "$lib/client/types/context.type";
  import context from "$lib/client/stores/context.store";

  let isInFocusMode = false;
  let pinnedItems: IRecordId[] = tabs.get() ?? [];

  $: currentTab = $page.url.searchParams.get(ResourceAccessMode.TAB);
  $: isInterimTab =
    currentTab && !pinnedItems.some((x) => x.toString() === currentTab);

  $: isSubscriber =
    $account?.plan && $account?.dataMode === UserDataMode.CLOUD
      ? determineIfActiveSubscriber($account.plan)
      : false;

  let isHideMenuLabels = uiState.getState(UIState.hideLeftNavMenuLabels, {
    scope: UIStateScope.DAP
  });

  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }

  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get() ?? [];
      isHideMenuLabels = uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
</script>

{#if !isInFocusMode}
  <div
    class={cn(
      "w-full h-11 max-h-11 min-h-11 2k:h-12 2k:max-h-12 2k:min-h-12 bg-bgs2 pr-4 border-b border-brs3 userdata embed-ios:mt-12 embed-tablet:mt-12 relative embed-ios:before:absolute embed-ios:before:-top-12 embed-ios:before:bottom-0 embed-ios:before:left-0 embed-ios:before:right-0 embed-ios:before:bg-bgs2",
      {
        "flex gap-3 justify-between items-center":
          pinnedItems.length > 0 || isInterimTab,
        "grid grid-cols-3": pinnedItems.length === 0 && !isInterimTab
      }
    )}
  >
    {#if pinnedItems.length > 0}
      <div class="flex items-center relative h-full overflow-x-auto">
        {#if $context.embed !== Embed.HANDSET}
          <TopNavLeftLogo {isHideMenuLabels} />
        {/if}
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
      <TopNavLeftLogo {isHideMenuLabels} />
    {/if}
    {#if pinnedItems.length === 0 && !isInterimTab}
      <div class="flex items-center justify-center">
        <button
          class="flex items-center justify-between w-96 bg-bgs3 hover:bg-bgs4 rounded-md px-3 py-1 mx-3 text-b2 text-fgs2"
          transition:fly={{
            duration: 300,
            x: 40
          }}
          on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
        >
          <span>Search</span>
          <ShortcutText
            shortcut={Action.GLOBAL_SEARCH}
            parentBgIndex={2}
            isAlwaysShown={true}
          />
        </button>
      </div>
    {/if}
    <div class="flex items-center justify-end gap-1 h-full">
      {#if isInterimTab && currentTab}
        {#key currentTab}
          <TopBarResourceItem
            item={currentTab}
            on:click
            isInterimTab
            on:close={() => {
              appStore.goBack();
            }}
          />
        {/key}
      {/if}
      {#if pinnedItems.length > 0 || isInterimTab}
        <div
          class="flex h-full"
          transition:fly={{
            duration: 300,
            x: -60
          }}
        >
          <TopNavLeftMenuItem
            icon="search"
            tooltip="Search"
            shortcut={Action.GLOBAL_SEARCH}
            on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
          />
        </div>
      {/if}
      <slot name="topnav" />
      <TopNavLeftMenuItem
        icon="terminal-window"
        tooltip="Command bar"
        shortcut={Action.CMD}
        on:click={() => appStore.runAction(Action.CMD)}
      />
      <TopNavLeftMenuItem
        icon="question"
        tooltip="Help"
        on:click={() => appStore.runAction(Action.HELP)}
      />
      <InlineSyncingFeedback
        resource={Resource.everything}
        isShorter={true}
        text="Syncing..."
      />
      <TrailLeftIndicator />
      <button
        class={cn(
          "flex items-center gap-2 rounded-full overflow-hidden border border-transparent ml-2",
          {
            "outline outline-ags1 hover:outline-ags2": isSubscriber,
            "hover:outline hover:outline-brs3": !isSubscriber
          }
        )}
        use:tooltip={{
          text: "Account"
        }}
        on:click={() => appStore.runAction(Action.SETTINGS)}
      >
        <ProfilePicture context="topbar" />
      </button>
    </div>
  </div>
{/if}
<svelte:window on:focusMode={handleFocusMode} />
