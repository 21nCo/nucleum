<script lang="ts">
  import { onMount } from "svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { Layout } from "$lib/client/types/layout.type";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import {
    resourceAction,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import { focusAggregates } from "../../analytics/analytics.store";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import QuickStartThumbnailList from "./QuickStartThumbnailList.svelte";
  import view from "$lib/client/stores/view.store";
  import QuickStartLayoutToggle from "./actions/QuickStartLayoutToggle.svelte";

  let isLoadingState = false;
  let searchQuery = "";
  let layout = Layout.LIST;
  let isInEditMode = false;
  let searchStore: SearchStore = new SearchStore(Resource.goal);
  restoreLayoutState();
  let items: IGoalThumb[] = [];
  let searchPinnedItems: IGoalThumb[] = [];
  let searchUnpinnedItems: IGoalThumb[] = [];

  onMount(() => {
    refresh();
    const sub = uiState.subscribe((x) => {
      restoreLayoutState();
    });
    return () => {
      sub();
    };
  });

  function restoreLayoutState() {
    const layoutState = uiState.getState(UIState.quickFocusLayout, {
      scope: UIStateScope.DEVICE
    });
    layout = layoutState ?? Layout.LIST;
  }

  async function refresh(params?: { isPreventLoadingPulse?: boolean }) {
    if (!params?.isPreventLoadingPulse) isLoadingState = true;
    const result = await searchStore.select({
      filters: {
        isPinnedForQuickFocus: true
      },
      searchQuery: "",
      isIncludeSubItems: true
    });
    const focusData = await focusAggregates.aggregateFocusForCurrentDay({
      goalIds: result.map((x: any) => x.id)
    });
    if (isValidArray(result)) {
      items = result
        .map((x: any) => ({
          ...x,
          color: resolveGoalColor(x),
          focus: focusData ? focusData?.find(resourceInList(x.id))?.focus : 0
        }))
        .sort((a: IGoalThumb, b: IGoalThumb) => {
          if (a.color === b.color) {
            return a.label.localeCompare(b.label);
          }
          if (a.color === undefined) return 1;
          if (b.color === undefined) return -1;
          return a.color - b.color;
        });
    }
    isLoadingState = false;
  }

  async function onSearch(event: any) {
    const val = event.detail;
    if (!val) {
      searchQuery = "";
      refresh({ isPreventLoadingPulse: true });
      searchPinnedItems = [];
      searchUnpinnedItems = [];
      return;
    }
    isLoadingState = true;
    searchQuery = val;
    const result = await searchStore.select({
      searchQuery,
      filters: {
        isPinnedForQuickFocus: undefined
      },
      isIncludeSubItems: true
    });
    if (isValidArray(result)) {
      const allItems = result.map((x: any) => ({
        ...x,
        color: resolveGoalColor(x)
      }));
      searchPinnedItems = allItems.filter((x: any) => x.isPinnedForQuickFocus);
      searchUnpinnedItems = allItems.filter(
        (x: any) => !x.isPinnedForQuickFocus
      );
    }
    isLoadingState = false;
  }

  function createNewGoal(isPreventOpenAfterCreate: boolean = true) {
    appStore.runAction(
      resourceAction(Resource.goal, ResourceActionType.CREATE),
      {
        componentParams: {
          isQuickFocus: true,
          context: PointronAction.PIN_TO_QUICK_FOCUS,
          label: searchQuery,
          isPreventOpenAfterCreate
        }
      }
    );
  }
</script>

<div class="flex flex-col flex-grow gap-4 w-full">
  <InlineSearchBar
    query={searchQuery}
    isPadded={true}
    on:search={onSearch}
    placeholder="Search a goal to quick focus"
    on:enter={() => createNewGoal()}
    padding={$context.embed === Embed.HANDSET || $view.isConstrainedWidth
      ? "pl-4 pr-2"
      : undefined}
  >
    {#if $context.embed === Embed.HANDSET || $view.isConstrainedWidth}
      <div class="flex justify-center shrink-0">
        <QuickStartLayoutToggle />
      </div>
    {/if}
  </InlineSearchBar>
  {#if !isLoadingState && ((items.length > 0 && !searchQuery) || (searchQuery && (searchPinnedItems.length > 0 || searchUnpinnedItems.length > 0)))}
    {#if searchQuery}
      <div class="flex flex-col gap-12">
        <QuickStartThumbnailList
          items={searchPinnedItems}
          {layout}
          {isInEditMode}
          title="Pinned"
          emptyStatusText={`No pinned goals found with "${searchQuery}"`}
        />
        <QuickStartThumbnailList
          items={searchUnpinnedItems}
          {layout}
          {isInEditMode}
          title="Other goals"
          emptyStatusText={`No other goals found with "${searchQuery}"`}
        />
      </div>
    {:else}
      <QuickStartThumbnailList {items} {layout} {isInEditMode} />
    {/if}
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
        style={ButtonStyle.OUTLINED}
        isPreventMinWidth={true}
        on:click={() => (isInEditMode = !isInEditMode)}
      />
    </div>
    <ScrollViewBottomSpacer />
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      isSearchContext={true}
      loadingAnimation={layout !== Layout.LIST
        ? LoadingAnimationType.QUICK_FOCUS_ITEMS_GRID_PULSE
        : LoadingAnimationType.FOCUS_ITEMS_PULSE}
      mainText={searchQuery
        ? `No goals found for "${searchQuery}"`
        : "No pinned goals found"}
      subText={searchQuery
        ? "Press **Enter** to create a new goal & pin it here"
        : "Please create a new goal or pin an existing one"}
      actionText={"Create new goal"}
      on:click={() => createNewGoal(false)}
    />
  {/if}
</div>

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.goal, Resource.sessionLog])}
  subscribeToContext={new Set([
    PointronAction.PIN_TO_QUICK_FOCUS,
    PointronAction.FINISH_FOCUS_SESSION,
    PointronAction.MANUAL_FOCUS_ENTRY
  ])}
  on:change={() => {
    refresh({ isPreventLoadingPulse: true });
  }}
/>
