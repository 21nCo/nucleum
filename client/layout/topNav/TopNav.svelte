<script lang="ts">
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { onMount } from "svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { appStore } from "@21n/stores/app.store";
  import { Action } from "@21n/types/action.enum";
  import Tabs from "@21n/layout/topNav/tabs/Tabs.svelte";
  import { tabs, vTrail } from "@21n/layout/topNav/tabs/tabs.store";
  import TrailLeftIndicator from "@21n/layout/topNav/TrailLeftIndicator.svelte";
  import { fly } from "svelte/transition";
  import { quadIn } from "svelte/easing";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { page } from "$app/stores";
  import TopBarResourceItem from "@21n/layout/topNav/tabs/TopBarResourceItem.svelte";
  import { cn } from "@21n/utils/ui.utils";

  import TopNavLeftMenuItem from "@21n/layout/topNav/TopNavLeftMenuItem.svelte";
  import InlineSyncingFeedback from "@21n/elements/feedback/InlineSyncingFeedback.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import TopNavLeftLogo from "@21n/layout/topNav/TopNavLeftLogo.svelte";
  import { Embed } from "@21n/types/context.type";
  import context from "@21n/stores/context.store";
  import OfflineStatusMessage from "@21n/elements/feedback/OfflineStatusMessage.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { toasts } from "@21n/stores/notification.store";
  import ToastNotificationContent from "@21n/elements/feedback/ToastNotificationContent.svelte";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import BulkEditBar from "@21n/components/record/BulkEditBar.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import SearchInput from "@21n/components/search/SearchInput.svelte";
  import { searchStore } from "@21n/components/search/search.store";
  let pinnedItems: IRecordId[] = tabs.get() ?? [];
  let bulkEditCount = 0;
  let bulkEditContext: any = null;
  let bulkEditSubContext: string | undefined = undefined;
  const isDev = import.meta.env.DEV;
  let searchInputRef: SearchInput;
  let isSearchMode: boolean =
    new URLSearchParams(window.location.search).get(AccessMode.MAIN) ===
    Action.SEARCH;
  let isShowBackToSearch: boolean =
    $vTrail.base === Action.SEARCH &&
    new URLSearchParams(window.location.search).get(AccessMode.POP) !== null;

  $: currentTab = $page.url.searchParams.get(AccessMode.TAB);
  $: isInterimTab =
    currentTab && !pinnedItems.some((x) => x.toString() === currentTab);

  $: isRightOverlayMode = isValidArrayWithData($toasts);
  $: isFullOverlayMode = bulkEditCount > 0 || isSearchMode;

  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get() ?? [];
    });
    const bulkEditCountUnsub = bulkEditStore.count.subscribe((count) => {
      bulkEditCount = count;
    });
    const bulkEditContextUnsub = bulkEditStore.context.subscribe((ctx) => {
      bulkEditContext = ctx;
    });
    const bulkEditSubContextUnsub = bulkEditStore.subContext.subscribe(
      (sub) => {
        bulkEditSubContext = sub;
      }
    );

    const pageSub = page.subscribe((p) => {
      isSearchMode =
        p.url.searchParams.get(AccessMode.MAIN) === Action.SEARCH &&
        !p.url.searchParams.get(AccessMode.POP);
      isShowBackToSearch =
        $vTrail.base === Action.SEARCH &&
        p.url.searchParams.get(AccessMode.POP) !== null;
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (bulkEditCountUnsub) bulkEditCountUnsub();
      if (bulkEditContextUnsub) bulkEditContextUnsub();
      if (bulkEditSubContextUnsub) bulkEditSubContextUnsub();
      if (pageSub) pageSub();
    };
  });
</script>

<div class="hidden otopl:!block w-full min-h-6 h-6 bg-bgs2"></div>
<div
  class={cn(
    "w-full h-11 max-h-11 min-h-11 bg-bgs2 border-b border-brs3 userdata grid",
    {
      "grid-cols-[auto_1fr]": isFullOverlayMode
    },
    !isFullOverlayMode && {
      "grid-cols-[auto_auto_1fr_auto]": pinnedItems.length > 0,
      "grid-cols-[auto_1fr_auto]": pinnedItems.length < 1
    }
  )}
>
  {#if $context.embed !== Embed.HANDSET}
    <TopNavLeftLogo isRenderProfilePicture={true} />
  {/if}
  {#if !isFullOverlayMode}
    <div
      class={cn("flex h-full", {
        "border-r border-brs3": isShowBackToSearch
      })}
    >
      <TopNavLeftMenuItem
        action={Action.SEARCH}
        label={isShowBackToSearch ? "Back to search" : undefined}
        icon={isShowBackToSearch ? "back" : "search"}
        isFirstItem={true}
        isPreventDefault={true}
        on:click={() => {
          if (new URLSearchParams(window.location.search).get(AccessMode.POP)) {
            appStore.toggleSearchParam({
              [AccessMode.POP]: null,
              [AccessMode.MAIN]: Action.SEARCH
            });
            return;
          }
          appStore.toggleSearchParam({
            [AccessMode.MAIN]: Action.SEARCH
          });
        }}
      />
    </div>
    {#if pinnedItems.length > 0}
      <div
        class={cn(
          "flex items-center justify-start relative h-full flex-grow overflow-x-auto transition-opacity",
          {
            "opacity-80 hover:opacity-100":
              !isRightOverlayMode && !isFullOverlayMode,
            "opacity-60 hover:opacity-100": isRightOverlayMode
          }
        )}
      >
        <Tabs {pinnedItems} />
        <div
          class="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none"
        >
          <div
            class={cn(
              "h-full flex items-center justify-end bg-gradient-to-r from-transparent via-bgs2 to-bgs2 px-2",
              {
                "w-12": !isRightOverlayMode,
                "w-24": isRightOverlayMode
              }
            )}
          ></div>
        </div>
      </div>
    {/if}
  {/if}
  {#if isRightOverlayMode || isFullOverlayMode}
    <!-- TODO - multiple toasts case -->
    <div
      class={cn(
        "text-b2 w-full flex items-center justify-end pr-3 !opacity-100"
      )}
      in:fly={isSearchMode
        ? { duration: 1 }
        : { duration: 200, y: -10, easing: quadIn }}
    >
      {#if isSearchMode}
        <button
          class="flex items-center gap-2 justify-between w-full h-full text-b2 text-fgs2"
        >
          <TopNavLeftMenuItem
            action={Action.SEARCH}
            icon="cross"
            tooltip="Close search"
            isFirstItem={true}
            isPreventDefault={true}
            on:click={() => {
              searchStore.reset();
            }}
          />
          <SearchInput
            bind:this={searchInputRef}
            style={InputStyle.PLAIN}
            isAutoFocus={true}
          />
        </button>
      {:else if $toasts.length > 0}
        <ToastNotificationContent notification={$toasts[$toasts.length - 1]} />
      {:else if bulkEditCount > 0 && bulkEditContext}
        <BulkEditBar
          count={bulkEditCount}
          context={bulkEditContext}
          subContext={bulkEditSubContext}
          on:action={(e) =>
            bulkEditStore.onAction(e.detail.action, e.detail.data)}
          on:selectAll={() => bulkEditStore.onSelectAll()}
          on:clear={() => bulkEditStore.reset()}
        />
      {/if}
    </div>
  {:else}
    <div
      class="flex items-center justify-end h-full"
      in:fly={{ duration: 200, y: 10, easing: quadIn }}
    >
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
      <TrailLeftIndicator />
      <OfflineStatusMessage />
      <InlineSyncingFeedback
        resource={Resource.everything}
        isShorter={true}
        text="Syncing..."
      />
      <slot name="topnav" />
      <TopNavLeftMenuItem action={Action.TODAY} />
      <TopNavLeftMenuItem action={Action.NAVIGATOR} />
      <TopNavLeftMenuItem action={Action.CMD} />
      <TopNavLeftMenuItem action={Action.SETTINGS} isLastItem={true} />
      {#if isDev}
        <TopNavLeftMenuItem
          action={Action.RHOMBUS}
          label="Rhom"
          isLastItem={true}
        />
      {/if}
    </div>
  {/if}
</div>
