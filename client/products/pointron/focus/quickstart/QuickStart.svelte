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
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";

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
    const result = await searchStore.select({
      filters: {
        isPinnedForQuickFocus: true
      },
      searchQuery: "",
      isIncludeSubItems: true
    });
    if (isValidArray(result)) {
      items = result;
    }
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
      items = result;
    }
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
        "flex flex-col gap-3 grow": layout === Layout.LIST,
        "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
          layout != Layout.LIST,
        "gap-2": layout != Layout.LIST && !isInEditMode,
        "gap-5 pt-4": isInEditMode
      })}
    >
      {#each items as item, index (item)}
        <QuickStartThumbnail {refresh} {item} {layout} {isInEditMode} />
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
  {:else}
    <EmptyStatusView
      size={Size.sm}
      {isLoadingState}
      isSearchContext={true}
      mainText={"No pinned goals found"}
      subText="Please create a new goal or pin an existing one to the quick focus section."
      actionText={"Create new goal"}
      on:click={() => {
        appStore.runAction(
          resourceAction(Resource.goal, ResourceActionType.CREATE)
        );
      }}
    />
  {/if}
</div>

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.goal])}
  subscribeToContext={new Set([PointronAction.PIN_TO_QUICK_FOCUS])}
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
