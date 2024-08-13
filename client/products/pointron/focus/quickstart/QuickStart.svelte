<script lang="ts">
  import {
    startTouch,
    moveTouch,
    swipeIsRefreshing
  } from "$lib/client/utils/touchGesture";
  import { onMount } from "svelte";
  import QuickStartThumbnail from "./QuickStartThumbnail.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import QuickStartActions from "./actions/QuickStartActions.svelte";
  import { Layout } from "$lib/client/types/layout.type";
  import { TagId } from "$lib/client/types/pointron/tagId.enum";
  import { quickFocusItemStore } from "$lib/client/products/pointron/goals/goal.store";
  import RefreshingOverlayFeedback from "$lib/client/elements/feedback/RefreshingOverlayFeedback.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";

  let isLoadingState = false;
  let searchInput = "";
  let layout = Layout.LIST;
  let isInEditMode = false;
  restoreLayoutState();
  restoreTagSelection();
  $: selectedTagName =
    $quickFocusItemStore.selectedTagId &&
    $quickFocusItemStore.selectedTagId != TagId.ALL &&
    $quickFocusItemStore.selectedTagId != TagId.STARRED
      ? $tagStore.items.find((x) => x.id === $quickFocusItemStore.selectedTagId)
          ?.label
      : "";
  async function refresh() {
    isLoadingState = true;
    quickFocusItemStore.refresh(searchInput);
    isLoadingState = false;
  }
  function filter() {
    quickFocusItemStore.filter(searchInput);
  }
  onMount(() => {
    const sub = uiState.subscribe((x) => {
      restoreLayoutState();
      restoreTagSelection();
    });
    return () => {
      sub();
    };
  });
  function restoreLayoutState() {
    layout =
      uiState.getState(UIState.quickFocusLayout, {
        isDeviceScoped: true
      }) ?? Layout.LIST;
  }
  function restoreTagSelection() {
    $quickFocusItemStore.selectedTagId =
      uiState.getState(UIState.quickFocusTag, {
        isDeviceScoped: true
      }) ?? TagId.ALL;
    // filter();
  }
  function onTagSelect(e: CustomEvent<string>) {
    console.log("onTagSelect", e.detail);
    uiState.setState(UIState.quickFocusTag, e.detail, {
      isDeviceScoped: true
    });
    filter();
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
    on:search={filter}
    on:select={onTagSelect}
  />
  {#if !isLoadingState && $quickFocusItemStore.filteredItems && $quickFocusItemStore.filteredItems.length > 0}
    <div
      id="QSinner"
      on:touchstart|stopPropagation={startTouch}
      class={cn("relative w-full flex flex-col gap-6 flex-grow")}
    >
      <!-- TODO - attach swipe refresh on touch device -->
      <div
        class={cn("w-full", {
          "flex flex-col gap-3 grow": layout === Layout.LIST,
          "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
            layout != Layout.LIST,
          "gap-2": layout != Layout.LIST && !isInEditMode,
          "gap-5 pt-4": isInEditMode
        })}
      >
        {#if $quickFocusItemStore.isRefreshing}
          <RefreshingOverlayFeedback />
        {/if}
        {#each $quickFocusItemStore.filteredItems as goal, index (goal)}
          <QuickStartThumbnail {refresh} {goal} {layout} {isInEditMode} />
        {/each}
      </div>
      {#if $quickFocusItemStore.selectedTagId === TagId.ALL}
        <div class="flex flex--col gap-2 w-full justify-center items-center">
          {#if isInEditMode}
            <Button
              label="Pin another goal"
              size={Size.sm}
              type={ButtonVariant.PRIMARY}
              style={ButtonStyle.OUTLINED}
              on:click={() => {
                appStore.runAction(PointronAction.PIN_TO_QUICK_FOCUS);
              }}
            />
          {/if}
          <Button
            label={isInEditMode ? "Close editor" : "Edit"}
            size={Size.sm}
            isPreventMinWidth={true}
            on:click={() => (isInEditMode = !isInEditMode)}
          />
        </div>
      {/if}
      <ScrollViewBottomSpacer />
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      isSearchContext={true}
      mainText={$quickFocusItemStore.selectedTagId === TagId.STARRED
        ? "No favorite goals found"
        : !$quickFocusItemStore.selectedTagId ||
            $quickFocusItemStore.selectedTagId === TagId.ALL
          ? "No pinned goals found"
          : "No goals found"}
      actionText={!$quickFocusItemStore.selectedTagId ||
      $quickFocusItemStore.selectedTagId === TagId.ALL
        ? "Create new goal"
        : ""}
      on:click={() => {
        appStore.runAction(PointronAction.CREATE_EDIT_GOAL, {
          componentParams: {
            isPinToQuickFocus: true
          }
        });
      }}
    >
      <slot name="subtext" slot="subtext">
        {#if $quickFocusItemStore.selectedTagId === TagId.STARRED}
          Please favorite a pinned goal to see them here
        {:else if !$quickFocusItemStore.selectedTagId || $quickFocusItemStore.selectedTagId === TagId.ALL}
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
