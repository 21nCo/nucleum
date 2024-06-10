<script lang="ts">
  import {
    startTouch,
    moveTouch,
    swipeIsRefreshing
  } from "$lib/client/utils/touchGesture";
  import { onMount } from "svelte";
  import QuickStartThumbnail from "./QuickStartThumbnail.svelte";
  import view from "$lib/client/stores/view.store";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import QuickStartActions from "./actions/QuickStartActions.svelte";
  import { Layout } from "$lib/client/types/layout.type";
  import { TagId } from "$lib/client/types/pointron/tagId.enum";
  import { quickFocusItemStore } from "$lib/client/products/pointron/goals/goal.store";
  import RefreshingOverlayFeedback from "$lib/client/elements/feedback/RefreshingOverlayFeedback.svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { UIState } from "$lib/client/types/preferences.type";
  import { cn } from "$lib/client/utils/ui.utils";

  let isLoadingState = false;
  let searchInput = "";
  let selectedTagId = "";
  let layout = refreshLayoutState();
  $: selectedTagName =
    selectedTagId &&
    selectedTagId != TagId.ALL &&
    selectedTagId != TagId.FAVORITES
      ? $tagStore.tags.find((x) => x.id === selectedTagId)?.label
      : "";
  async function refresh() {
    isLoadingState = true;
    quickFocusItemStore.refresh({
      tag: selectedTagId,
      searchText: searchInput
    });
    isLoadingState = false;
  }
  function filter() {
    quickFocusItemStore.filter({ tag: selectedTagId, searchText: searchInput });
  }
  onMount(() => {
    const sub = userPreferences.subscribe((x) => {
      layout = refreshLayoutState();
    });
    return () => {
      sub();
    };
  });
  function refreshLayoutState() {
    return userPreferences.resolveUiState(UIState.quickFocusLayout);
  }
</script>

<div
  id="QSouter"
  on:touchstart={startTouch}
  on:touchmove={() =>
    moveTouch(event, undefined, undefined, refresh, undefined, undefined)}
  class="flex flex-col h-full gap-4 w-full"
>
  <!-- <div class="hidden text-xl" class:animate-spin={$swipeIsRefreshing}>↻</div> -->
  <QuickStartActions
    bind:searchInput
    bind:selectedTagId
    on:search={filter}
    on:select={filter}
  />
  {#if !isLoadingState && $quickFocusItemStore.filteredItems && $quickFocusItemStore.filteredItems.length > 0}
    <div
      id="QSinner"
      on:touchstart|stopPropagation={startTouch}
      class={cn("relative flex w-full overflow-y-auto pb-60", {
        "flex-col gap-3 flex-grow": layout === Layout.LIST,
        "flex-wrap gap-2": layout != Layout.LIST
      })}
    >
      <!-- TODO - attach swipe refresh on touch device -->
      {#if $quickFocusItemStore.isRefreshing}
        <RefreshingOverlayFeedback />
      {/if}
      {#each $quickFocusItemStore.filteredItems as goal, index (goal)}
        <QuickStartThumbnail {refresh} {goal} {layout} />
      {/each}
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      mainText={selectedTagId === TagId.FAVORITES
        ? "No favorite goals found"
        : !selectedTagId || selectedTagId === TagId.ALL
          ? "No pinned goals found"
          : "No goals found"}
      actionText={!selectedTagId || selectedTagId === TagId.ALL
        ? "Create new goal"
        : ""}
      on:click={() => {
        appStore.runAction(PointronEventEnum.CREATE_EDIT_GOAL, {
          isPinToQuickFocus: true
        });
      }}
    >
      <slot name="subtext" slot="subtext">
        {#if selectedTagId === TagId.FAVORITES}
          Please favorite a pinned goal to see them here
        {:else if !selectedTagId || selectedTagId === TagId.ALL}
          Please create a new goal or pin an existing one to the quick focus
          section.
        {:else}
          Please add the tag <b>#{selectedTagName ?? ""}</b> to a goal to see them
          here
        {/if}
      </slot>
    </EmptyStatusView>
  {/if}
</div>

<style>
  .animate-spin {
    display: block;
    position: absolute;
    top: 4%;
    left: 48%;
  }
</style>
