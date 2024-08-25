<script lang="ts">
  import { onMount } from "svelte";
  import QuickStartThumbnail from "./QuickStartThumbnail.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import QuickStartCombinedTagsBar from "./actions/QuickStartCombinedTagsBar.svelte";
  import { Layout } from "$lib/client/types/layout.type";
  import { TagId } from "$lib/client/types/pointron/tagId.enum";
  import { quickFocusItemStore } from "$lib/client/products/pointron/goals/goal.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import TagsContainer from "../../goals/TagsContainer.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";

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
  async function refresh(isShowRefreshingState: boolean = false) {
    isLoadingState = true;
    quickFocusItemStore.refresh(searchInput, isShowRefreshingState);
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
    const layoutState = uiState.getState(UIState.quickFocusLayout, {
      isDeviceScoped: true
    });
    layout = layoutState ?? Layout.LIST;
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

<div class="flex flex-col flex-grow gap-4 w-full">
  {#if $context.embed === Embed.HANDSET}
    <QuickStartCombinedTagsBar
      bind:searchInput
      on:search={filter}
      on:select={onTagSelect}
    />
  {:else}
    <InlineSearchBar
      bind:query={searchInput}
      isPadded={true}
      on:search={filter}
      placeholder="Search for a goal"
    />
    <div class="mo:p-0 px-3">
      <TagsContainer
        bind:selectedTagId={$quickFocusItemStore.selectedTagId}
        on:select={onTagSelect}
      />
    </div>
  {/if}
  {#if !isLoadingState && $quickFocusItemStore.filteredItems && $quickFocusItemStore.filteredItems.length > 0}
    <ScrollView
      class="flex flex-col w-full flex-grow gap-6 mo:p-0 px-3"
      isRefreshing={$quickFocusItemStore.isRefreshing}
      bottomSpacerSize={Size.lg}
      isRefreshOnPull={true}
      on:refresh={() => {
        refresh(true);
      }}
    >
      <div
        class={cn("w-full", {
          "flex flex-col gap-3 grow": layout === Layout.LIST,
          "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
            layout != Layout.LIST,
          "gap-2": layout != Layout.LIST && !isInEditMode,
          "gap-5 pt-4": isInEditMode
        })}
      >
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
    </ScrollView>
    <!-- <div
      id="QSinner"
      on:touchstart|stopPropagation={startTouch}
      class="relative w-full flex flex-grow"
    >
      {#if $quickFocusItemStore.isRefreshing}
        <RefreshingOverlayFeedback />
      {/if}
      <div class="flex flex-col w-full flex-grow gap-6 mo:p-0 px-3">
        <div
          class={cn("w-full", {
            "flex flex-col gap-3 grow": layout === Layout.LIST,
            "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
              layout != Layout.LIST,
            "gap-2": layout != Layout.LIST && !isInEditMode,
            "gap-5 pt-4": isInEditMode
          })}
        >
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
    </div> -->
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      isSearchContext={true}
      mainText={$quickFocusItemStore.selectedTagId === TagId.STARRED
        ? "No starred goals found"
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
          Please star a pinned goal to see them here
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
