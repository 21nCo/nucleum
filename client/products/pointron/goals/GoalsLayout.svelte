<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { page } from "$app/stores";
  import TagsContainer from "$lib/client/products/pointron/goals/TagsContainer.svelte";
  import { TagId } from "$lib/client/types/pointron/tagId.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { goalStore } from "./goal.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { onMount } from "svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import PageLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import TreeMap from "$lib/client/components/treeMap/TreeMap.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { tagStore } from "../pointron.store";
  import { archivedResourceFilter } from "$lib/client/utils/utils";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";

  export let isGoalsHome = window.location.pathname === "/goal";
  export let parentBackgroundIndex: number = 0;

  let selectedGoalId: string = "";
  let selectedTagId: TagId | string = TagId.ALL;
  $: isGoalsHome =
    $page?.url.pathname === "/goal" || $page?.url.pathname === "/goal/";
  $: selectedTagName =
    selectedTagId &&
    selectedTagId != TagId.ALL &&
    selectedTagId != TagId.STARRED
      ? $tagStore.items.find((x) => x.id === selectedTagId)?.label
      : "";

  let isArchivedGoalsVisible: boolean = false;
  let searchInput: string = "";
  let isGoalsLoading: boolean = false;

  function refresh(isShowRefreshingState: boolean = false) {
    dataManager.refreshPage(
      [Resource.PointGoal, Resource.PointTag],
      isShowRefreshingState
    );
  }
  function filter() {
    goalStore.filter({
      tag: selectedTagId,
      searchText: searchInput
    });
  }
  onMount(async () => {
    refresh();
  });
  function onGoalClick(event: CustomEvent<string>) {
    selectedGoalId = event.detail;
    appStore.gotoPath(`/goal/${selectedGoalId}`);
  }
</script>

{#if $view.isPortrait && !isGoalsHome}
  <div class="flex flex-col h-full w-full">
    <!-- <button
      class="flex max-w-min bg-bgs2 px-2"
      on:click={() => {
        windowObject.gotoPath("/goals");
      }}
    >
      <Icon icon="chevron-left" />
      <span class="text-b3">back</span>
    </button> -->
    <button
      class="flex mt-4 gap-1 items-center min-w-fit p-4 h-2 text-aps1"
      style="top: 1.75rem;"
      on:click={() => {
        appStore.gotoPath("/goal");
      }}
    >
      <Icon icon="chevleft" size={Size.sm} class="stroke-aps1" />
      <div class="pr-1">Back</div>
    </button>
    <slot />
  </div>
{:else if isGoalsHome || !$view.isPortrait}
  <div class="flex w-full h-full select-none relative">
    <Panel
      panelSize={Size.md}
      floatingButton={{
        label: "Create new goal",
        callback: async () =>
          appStore.runAction(PointronAction.CREATE_EDIT_GOAL),
        icon: "plus",
        variant: ButtonVariant.PRIMARY,
        style: ButtonStyle.OUTLINED
      }}
    >
      <slot name="nonpadded" slot="nonpadded">
        <div class="flex flex-col w-full gap-4 pb-2 items-start">
          <InlineSearchBar
            size={Size.lg}
            bind:query={searchInput}
            on:search={filter}
            isPadded={true}
            placeholder="Search goals"
          />
          <div class="px-2 w-full">
            <TagsContainer
              bind:selectedTagId
              on:select={filter}
              isShowAddTag={true}
            />
          </div>
        </div>
        <ScrollView
          isRefreshOnPull={true}
          isRefreshing={$goalStore.isRefreshing}
          on:refresh={() => {
            refresh(true);
          }}
          class="relative flex flex-col h-full gap-8 flex-grow pt-4"
        >
          <div class="h-full w-full">
            {#if isValidArrayWithData($goalStore.filtered)}
              <div class="w-full grow">
                <TreeMap
                  items={$goalStore.filtered?.map((x) => x.id)}
                  contentCallback={goalStore.resolveGoal.bind(goalStore)}
                  childrenCallback={goalStore.resolveChildren.bind(goalStore)}
                  on:click={onGoalClick}
                />
              </div>
              {#if $goalStore.items.filter(archivedResourceFilter).length > 0 && !isGoalsLoading && !searchInput && selectedTagId === TagId.ALL}
                <div
                  class="acrchived-goals flex flex-col items-center mt-[6rem]"
                >
                  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                  <div
                    tabindex="0"
                    on:keydown={() => {}}
                    on:click={() => {
                      isArchivedGoalsVisible = !isArchivedGoalsVisible;
                    }}
                    class="cursor-pointer flex items-center gap-2 py-3"
                  >
                    <Icon
                      size={Size.sm}
                      icon={isArchivedGoalsVisible ? "chevdown" : "chevup"}
                    />
                    <h3 class="text-fgs3 uppercase text-b2">
                      Archived goals ( {$goalStore.items.filter(
                        archivedResourceFilter
                      ).length} )
                    </h3>
                    <!-- <div
                      class={`inverted-triangle-path w-2.5 h-2 bg-fgs3 ${
                        isArchivedGoalsVisible ? `rotate-[180deg]` : ``
                      }`}
                    /> -->
                  </div>
                  {#if isArchivedGoalsVisible}
                    <TreeMap
                      items={$goalStore.items
                        .filter(archivedResourceFilter)
                        .map((x) => x.id)}
                      contentCallback={goalStore.resolveGoal.bind(goalStore)}
                      childrenCallback={goalStore.resolveChildren.bind(
                        goalStore
                      )}
                      on:click={onGoalClick}
                    />
                    <div class="pb-32"></div>
                  {/if}
                </div>
              {/if}
              <ScrollViewBottomSpacer />
            {:else}
              <EmptyStatusView
                size={Size.sm}
                isLoadingState={isGoalsLoading}
                mainText="No goals found"
                isSearchContext={true}
              >
                <slot name="subtext" slot="subtext">
                  {#if selectedTagId === TagId.STARRED}
                    Please favorite a goal to see them here.
                  {:else if !selectedTagId || selectedTagId === TagId.ALL}
                    Please create a new goal using the button below.
                  {:else}
                    Please add the tag <b>#{selectedTagName ?? ""}</b> to a goal
                    to see them here
                  {/if}
                </slot>
              </EmptyStatusView>
            {/if}
          </div>
        </ScrollView>
      </slot>
      <slot name="right" slot="right">
        <slot />
      </slot>
    </Panel>
  </div>
  <style>
    .inverted-triangle-path {
      clip-path: polygon(0% 0%, 50% 100%, 100% 0%);
    }
  </style>
{/if}
<PageLayer on:appear={() => refresh()} />

<style>
  .animate-spin {
    display: block;
    position: absolute;
    top: 4%;
    left: 48%;
  }
</style>
