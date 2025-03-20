<script lang="ts">
  import { onMount } from "svelte";
  import QuickStartThumbnail from "./QuickStartThumbnail.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import QuickStartCombinedTagsBar from "./actions/QuickStartCombinedTagsBar.svelte";
  import { Layout } from "$lib/client/types/layout.type";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import {
    isSameResource,
    resourceAction,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { resolveGoalColor } from "$lib/client/components/goals/goal.utils";
  import { focusAggregates } from "../../analytics/analytics.store";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";

  let isLoadingState = false;
  let searchInput = "";
  let layout = Layout.LIST;
  let isInEditMode = false;
  let searchStore: SearchStore = new SearchStore(Resource.goal);
  restoreLayoutState();
  let items: IGoalThumb[] = [];

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
      isDeviceScoped: true
    });
    layout = layoutState ?? Layout.LIST;
  }

  async function refresh() {
    isLoadingState = true;
    const result = await searchStore.select({
      filters: {
        isPinnedForQuickFocus: true
      },
      searchQuery: "",
      isIncludeSubItems: true
    });
    const focusData = await focusAggregates.aggregateFocusForADay({
      day: new Date(),
      goalIds: result.map((x: any) => x.id)
    });
    if (isValidArray(result)) {
      items = result
        .map((x: any) => ({
          ...x,
          color: resolveGoalColor(x),
          focus: focusData.find(resourceInList(x.id))?.focus
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
    if (!searchInput) {
      refresh();
      return;
    }
    const result = await searchStore.select({
      searchQuery: searchInput,
      filters: {
        isPinnedForQuickFocus: undefined
      },
      isIncludeSubItems: true
    });
    if (isValidArray(result)) {
      items = result.map((x: any) => ({
        ...x,
        color: resolveGoalColor(x)
      }));
    }
  }

  function onUnpin(e: CustomEvent<IRecordId>) {
    items = items.filter((x) => !isSameResource(x.id, e.detail));
  }
</script>

<div class="flex flex-col flex-grow gap-4 w-full">
  {#if $context.embed === Embed.HANDSET}
    <QuickStartCombinedTagsBar bind:searchInput on:searchSort />
  {:else}
    <InlineSearchBar
      bind:query={searchInput}
      isPadded={true}
      on:search={onSearch}
      placeholder="Search for a goal"
    />
    <!-- <div class="mo:p-0 px-3">
      <TagsContainer
        bind:selectedTagId={$quickFocusItemStore.selectedTagId}
        on:select={onTagSelect}
      />
    </div> -->
  {/if}
  {#if !isLoadingState && items.length > 0}
    <div
      class={cn("w-full px-4", {
        "flex flex-col gap-3": layout === Layout.LIST,
        "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
          layout != Layout.LIST,
        "gap-2": layout != Layout.LIST && !isInEditMode,
        "gap-5 pt-4": isInEditMode
      })}
    >
      {#each items as item, index (item)}
        <QuickStartThumbnail
          {item}
          {layout}
          {isInEditMode}
          on:unpin={onUnpin}
        />
      {/each}
    </div>

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
    <ScrollViewBottomSpacer />
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      isSearchContext={true}
      loadingAnimation={layout !== Layout.LIST
        ? LoadingAnimationType.QUICK_FOCUS_ITEMS_GRID_PULSE
        : LoadingAnimationType.FOCUS_ITEMS_PULSE}
      mainText={"No pinned goals found"}
      subText="Please create a new goal or pin an existing one to the quick focus section."
      actionText={"Create new goal"}
      on:click={() => {
        appStore.runAction(
          resourceAction(Resource.goal, ResourceActionType.CREATE),
          {
            componentParams: {
              isQuickFocus: true,
              context: PointronAction.PIN_TO_QUICK_FOCUS
            }
          }
        );
      }}
    />
  {/if}
</div>

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.goal, Resource.sessionLog])}
  subscribeToContext={new Set([
    PointronAction.PIN_TO_QUICK_FOCUS,
    PointronAction.FINISH_FOCUS_SESSION
  ])}
  on:change={refresh}
/>

<style>
  .animate-spin {
    display: block;
    position: absolute;
    top: 4%;
    left: 48%;
  }
</style>
