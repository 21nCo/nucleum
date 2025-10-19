<script lang="ts">
  import { ActiveGoalStore, type IActiveGoalStore } from "@21n/components/goals/goal.store";
  import PageLoadingPulse from "@21n/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";

  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { resolveResourceIcon } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import GoalInfoPanel from "@21n/components/goals/info/GoalInfoPanel.svelte";
  import view from "@21n/stores/view.store";
  import { resizeListener } from "@21n/actions/resize.action";
  import GoalTitleRow from "@21n/components/goals/info/GoalTitleRow.svelte";
  import SubGoalsPanel from "@21n/components/goals/sub/SubGoalsPanel.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import { appStore } from "@21n/stores/app.store";
  import GoalHistory from "@21n/components/goals/history/GoalHistory.svelte";
  import GoalTasks from "@21n/components/goals/tasks/GoalTasks.svelte";
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/stores";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import appearance from "@21n/stores/appearance.store";
  import { Product } from "@21n/products/product.type";
  import type { IActiveGoal } from "@21n/components/goals/goal.type";
  import GoalAnalytics from "@21n/components/goals/GoalAnalytics.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { type IInlineStatus } from "@21n/types/notification.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { Size } from "@21n/types/size.enum";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import ResourceInlineCloseButton from "@21n/elements/button/ResourceInlineCloseButton.svelte";
  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  export let status: IInlineStatus | undefined = undefined;
  let containerWidth = 0;
  let goal: IActiveGoalStore = ActiveGoalStore.resolve(id);
  let isReady = false;
  $: isActiveResource =
    !$goal?.isArchived && !$goal?.trashInformation && !$goal?.isParentInactive;
  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $goal?.accessMode === ResourceAccessMode.SPLIT ||
    $goal?.accessMode === ResourceAccessMode.FSPLIT ||
    $goal?.accessMode === ResourceAccessMode.INLINE ||
    containerWidth < 800;
  $: tabs = resolvePanelSwitcherItems($goal, isConstrainedWidth);

  let selectedPanel = isConstrainedWidth ? "info" : "subgoals";
  initialize();

  onMount(() => {
    const pageSub = page.subscribe((page) => {
      const tab = resolveTabParam();
      if (tab) {
        selectedPanel = tab;
      }
    });
    return () => {
      pageSub();
    };
  });

  onDestroy(() => {
    const latestAccessMode = $goal?.accessMode ?? accessMode;
    ActiveGoalStore.destroy(id, latestAccessMode);
  });

  async function initialize() {
    const editSearchParam = $page.url.searchParams.get(AppSearchParam.EDIT);
    const linkSearchParam = $page.url.searchParams.get(AppSearchParam.LINK);
    await goal.init(accessMode, {
      isInEditMode: editSearchParam === "true",
      linkSearchParam: linkSearchParam ?? undefined
    });
    isReady = true;
    goal.afterInit();
  }

  function resolveTabParam() {
    try {
      if (!$goal) return;
      return $page.url.searchParams.get(
        appStore.resolveRecordSpecificSearchParam($goal.id, AppSearchParam.TAB)
      );
    } catch (error) {
      logger.error({
        at: "Goal.svelte",
        error,
        goalId: $goal?.id
      });
    }
  }

  function resolvePanelSwitcherItems(
    goal: IActiveGoal,
    isConstrainedWidth: boolean
  ) {
    let items = [
      {
        label: "Sub goals",
        value: "subgoals",
        icon: resolveResourceIcon(Resource.goal),
        badge: goal?.children?.length
      },
      {
        label: "Tasks",
        value: "tasks",
        icon: resolveResourceIcon(Resource.task),
        badge: goal?.taskCount
      },
      {
        label: "Analytics",
        value: "analytics",
        icon: "chart-line-up"
      },
      {
        label: "History",
        value: "history",
        icon: "history"
      }
    ];
    if (isConstrainedWidth) {
      items.unshift({
        label: "Info",
        value: "info",
        icon: "info"
      });
    }
    if (goal?.types && goal?.types?.length > 0) {
      items.push({
        label: "Properties",
        value: "properties",
        icon: "shapes"
      });
    }
    if ($appStore.product === Product.NUCLEUS) {
      items.push({
        label: "Links",
        value: "links",
        icon: "link"
      });
    }
    if (goal?.uiState?.tabsOrder) {
      const orderedItems = goal.uiState.tabsOrder
        .map((x) => {
          const item = items.find((y) => y.value === x);
          if (item) {
            return item;
          }
          return null;
        })
        .filter((x) => x !== null);
      items = [
        ...orderedItems,
        ...items.filter((x) => !orderedItems.includes(x))
      ];
    }
    const tab = resolveTabParam();
    if (tab) {
      selectedPanel = tab;
    } else {
      selectedPanel = items[0].value;
    }
    return items;
  }

  function showAllProperties() {
    setTab("properties");
  }

  async function rearrangePanels(e: CustomEvent) {
    if (!Array.isArray(e.detail)) {
      return;
    }
    const items = e.detail;
    await goal.modify({
      uiState: {
        ...($goal.uiState ?? {}),
        tabsOrder: items
      }
    });
  }

  function setTab(tab: string) {
    appStore.toggleSearchParamRecordSpecific($goal.id, {
      [AppSearchParam.TAB]: tab
    });
  }
</script>

<CustomColorPropagator
  class={cn("h-full w-full bg-gradient-to-br from-bgs1 via-bgs1", {
    "to-ccs5/50": $appearance?.colorScheme?.isDark,
    "to-ccs5": !$appearance?.colorScheme?.isDark
  })}
  color={$goal?.color ?? ($goal?.parent ? $goal.parent?.[0]?.color : undefined)}
>
  {#if !$goal || !isReady}
    <div class="w-full h-full p-4">
      <PageLoadingPulse />
    </div>
  {:else if $goal}
    <div
      class="flex w-full h-full gap-4 overflow-auto"
      use:resizeListener={(e) => {
        containerWidth = e.width;
      }}
    >
      {#if !isConstrainedWidth}
        <aside
          class="flex flex-col gap-4 bg-bgs2 border-r border-brs2 p-4 w-96 2k:w-[30rem] overflow-auto"
        >
          <GoalInfoPanel
            {goal}
            on:showAllProperties={showAllProperties}
            bind:status
          />
        </aside>
      {/if}
      <main
        class={cn("flex flex-col gap-4 flex-1 overflow-auto", {
          "py-4 pr-4": !isConstrainedWidth
        })}
      >
        <div
          class={cn(
            "relative flex flex-col w-full overflow-auto gap-3 bg-bgs2 otop:pt-12 shrink-0",
            {
              "rounded-lg border border-brs3": !isConstrainedWidth,
              "border-b border-brs3": isConstrainedWidth
            }
          )}
        >
          {#if isConstrainedWidth}
            <GoalTitleRow {goal} isConstrainedWidth={true} bind:status />
          {/if}
          <div class="relative">
            <PanelSwitcher
              items={tabs}
              style={PanelSwitcherStyle.BAR}
              value={selectedPanel}
              isExpandToFullWidth={true}
              parentBgIndex={2}
              isBgBar={true}
              size={Size.sm}
              isRearrangeableByDefault={true}
              on:rearrange={rearrangePanels}
              on:switch={(e) => {
                setTab(e.detail);
              }}
            >
              <div slot="right">
                {#if $goal.accessMode === ResourceAccessMode.FULL && !isConstrainedWidth}
                  <ResourceInlineCloseButton
                    accessMode={$goal.accessMode}
                    parentBgIndex={2}
                    id={$goal.id}
                  />
                {/if}
              </div>
            </PanelSwitcher>
            {#if isConstrainedWidth}
              <div
                class="w-10 bg-gradient-to-r from-bgs2/20 to-bgs2 absolute right-0 top-0 h-full"
              />
            {/if}
          </div>
        </div>
        <div
          class={cn("flex-1 overflow-auto", {
            "px-3": isConstrainedWidth
          })}
        >
          {#if selectedPanel === "info"}
            <GoalInfoPanel
              {goal}
              {isConstrainedWidth}
              bind:status
              on:showAllProperties={showAllProperties}
            />
          {:else if selectedPanel === "subgoals"}
            <SubGoalsPanel {goal} {isActiveResource} />
          {:else if selectedPanel === "history"}
            <GoalHistory {goal} />
          {:else if selectedPanel === "tasks"}
            <GoalTasks id={$goal.id} {isActiveResource} />
          {:else if selectedPanel === "analytics"}
            <GoalAnalytics id={$goal.id} />
          {:else if selectedPanel === "properties"}
            <div class="flex w-full justify-center">
              <div class="w-96">
                <PropertiesPane item={goal} resource={Resource.goal} />
              </div>
            </div>
          {/if}
        </div>
      </main>
    </div>
  {/if}
</CustomColorPropagator>
<ComponentBaseLayer
  subscribeToRecords={[id]}
  on:change={(e) => {
    try {
      if ("parent" in e.detail.params.record) {
        isReady = false;
        initialize();
      }
    } catch (error) {
      logger.error({
        at: "Goal.svelte - change subscription error",
        error,
        goalId: $goal?.id
      });
    }
  }}
/>
