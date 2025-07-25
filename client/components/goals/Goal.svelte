<script lang="ts">
  import { ActiveGoalStore, type IActiveGoalStore } from "./goal.store";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";

  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import GoalInfoPanel from "./info/GoalInfoPanel.svelte";
  import view from "$lib/client/stores/view.store";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import GoalTitleRow from "./info/GoalTitleRow.svelte";
  import SubGoalsPanel from "./sub/SubGoalsPanel.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import GoalHistory from "./history/GoalHistory.svelte";
  import GoalTasks from "./tasks/GoalTasks.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import PropertiesPane from "../collection/properties/PropertiesPane.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import { Product } from "$lib/client/types/product.type";
  import type { IActiveGoal } from "./goal.type";
  import GoalAnalytics from "./GoalAnalytics.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { type IInlineStatus } from "$lib/client/types/notification.type";
  import { logger } from "../debug/logger.client";
  import { Size } from "$lib/client/types/size.enum";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
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
        icon: "ph:chart-line-up-light"
      },
      {
        label: "History",
        value: "history",
        icon: "ph:clock-counter-clockwise-light"
      }
    ];
    if (isConstrainedWidth) {
      items.unshift({
        label: "Info",
        value: "info",
        icon: "ph:info-light"
      });
    }
    if (goal?.types && goal?.types?.length > 0) {
      items.push({
        label: "Properties",
        value: "properties",
        icon: "ph:shapes-light"
      });
    }
    if ($appStore.product === Product.NUCLEUS) {
      items.push({
        label: "Links",
        value: "links",
        icon: "ph:link-light"
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
      class="flex w-full h-full gap-4 p-4 overflow-auto"
      use:resizeListener={(e) => {
        containerWidth = e.width;
      }}
    >
      {#if !isConstrainedWidth}
        <aside
          class="flex flex-col gap-4 bg--bgs2 border border-brs3 rounded-lg p-4 w-96 2k:w-[30rem] overflow-auto"
        >
          <GoalInfoPanel
            {goal}
            on:showAllProperties={showAllProperties}
            bind:status
          />
        </aside>
      {/if}
      <main class="flex flex-col gap-4 flex-1 overflow-auto">
        <div
          class="relative flex flex-col w-full overflow-auto gap-3 bg-bgs2 rounded-lg border border-brs3 shrink-0"
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
                {#if $goal.accessMode === ResourceAccessMode.FULL}
                  <Button
                    icon="ph:x-light"
                    tooltip="Close full screen"
                    parentBgIndex={2}
                    on:click={() => {
                      appStore.closeResource({ id: $goal.id });
                    }}
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
        <div class="flex-1 overflow-auto">
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
