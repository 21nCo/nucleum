<script lang="ts">
  import {
    ActiveGoalStore,
    resolvePanelOptions,
    type IActiveGoalStore
  } from "@21n/components/goals/goal.store";
  import PageLoadingPulse from "@21n/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import GoalTitleRow from "@21n/components/goals/info/GoalTitleRow.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import { onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { cn } from "@21n/utils/ui.utils";
  import appearance from "@21n/stores/appearance.store";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { type IInlineStatus } from "@21n/types/notification.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { Size } from "@21n/types/size.enum";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import ResourceInlineCloseButton from "@21n/elements/button/ResourceInlineCloseButton.svelte";
  import GoalPanelSwitcher from "./GoalPanelSwitcher.svelte";
  import { resolvePanelParam } from "@21n/components/resource/panelParam.mixin";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import GoalPanelContentResolver from "./GoalPanelContentResolver.svelte";
  import GoalLeftPanel from "./GoalLeftPanel.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ResourcePanelType } from "../resource/resourcePanel.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { ErrorMessage } from "../error/error.type";
  import { getContext } from "svelte";
  import { readable, type Writable } from "svelte/store";
  import { Context } from "@21n/types/appStore.type";
  import type { IContainer } from "@21n/layout/layout.type";
  import { resolveMinWidth } from "@21n/layout/layout.utils";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";

  let {
    id,
    accessPoint = ResourceAccessPoint.SELF,
    accessMode = AccessMode.POP,
    status = $bindable()
  }: {
    id: string;
    accessPoint?: ResourceAccessPoint;
    accessMode?: AccessMode;
    status?: IInlineStatus | undefined;
  } = $props();

  const dev_isPanelSwitcherOnTop = false;

  const container =
    getContext<Writable<IContainer | undefined>>(Context.CONTAINER) ||
    readable(undefined);
  const goal: IActiveGoalStore = $derived(ActiveGoalStore.resolve(id));
  let isReady = $state(false);

  const isConstrainedWidth = $derived(
    ($container && $container.width < resolveMinWidth(2)) ?? false
  );
  const isThreeColumned = $derived(
    ($container && $container.width >= resolveMinWidth(3)) ?? false
  );

  const tabs = $derived(
    resolvePanelOptions($goal, { isConstrainedWidth, isThreeColumned })
  );

  $effect(() => {
    if (
      tabs &&
      $goal &&
      $goal.panel &&
      !tabs.find((tab) => tab.value === $goal.panel)
    ) {
      goal.switchPanel(tabs[0].value);
    }
  });

  onDestroy(() => {
    const latestAccessMode = $goal?.accessMode ?? accessMode;
    ActiveGoalStore.destroy(id, latestAccessMode);
  });

  function resolvePreviouslySelectedView() {
    const panelState = uiState.getState(UIState.goalPanelSelection, {
      scope: UIStateScope.DEVICE,
      subVariables: [
        isConstrainedWidth?.toString(),
        isThreeColumned?.toString()
      ]
    });
    return panelState;
  }

  async function initialize() {
    const editSearchParam = $page.url.searchParams.get(AppSearchParam.EDIT);
    const linkSearchParam = $page.url.searchParams.get(AppSearchParam.LINK);
    const panel = resolvePanelParam(id, "Goal.svelte");
    await goal.init(accessMode, {
      isInEditMode: editSearchParam === "true",
      linkSearchParam: linkSearchParam ?? undefined,
      panel:
        panel ??
        resolvePreviouslySelectedView() ??
        (isThreeColumned
          ? ResourcePanelType.OVERVIEW
          : ResourcePanelType.DEFAULT)
    });
    isReady = true;
    return goal.afterInit();
  }

  let initPromise = $state<Promise<void>>(initialize());

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
</script>

<div class="flex w-full h-full overflow-auto">
  {#await initPromise}
    <EmptyStatusView isLoadingState={true} />
  {:then}
    <CustomColorPropagator
      class={cn("h-full w-full bg-gradient-to-br from-bgs1 via-bgs1", {
        "to-ccs5/50": $appearance?.colorScheme?.isDark,
        "to-ccs5": !$appearance?.colorScheme?.isDark
      })}
      color={$goal?.color ??
        ($goal?.parent ? $goal.parent?.[0]?.color : undefined)}
    >
      {#if !$goal || !isReady}
        <div class="w-full h-full p-4">
          <PageLoadingPulse />
        </div>
      {:else if $goal}
        <div class="flex w-full h-full overflow-auto">
          {#if !isConstrainedWidth}
            <aside
              class="flex flex-col gap-4 border-r border-brs2 w-96 2k:w-[35rem]"
            >
              <GoalLeftPanel {goal} {isConstrainedWidth} bind:status />
            </aside>
          {/if}
          <GoalPanelSwitcher
            panels={tabs}
            {goal}
            {isConstrainedWidth}
            {isThreeColumned}
          />
          <main class="flex flex-col flex-1 overflow-auto">
            {#if isConstrainedWidth}
              <div
                class={cn(
                  "relative flex flex-col w-full overflow-auto gap-3 cw:bg-bgs2 otop:pt-12 shrink-0 border-b border-brs3",
                  {
                    "bg-bgs2 py-2": isConstrainedWidth
                  }
                )}
              >
                <GoalTitleRow {goal} isConstrainedWidth={true} bind:status />
                {#if dev_isPanelSwitcherOnTop}
                  <div class="relative">
                    <PanelSwitcher
                      items={tabs}
                      style={PanelSwitcherStyle.BAR}
                      value={$goal.panel}
                      isExpandToFullWidth={true}
                      parentBgIndex={2}
                      isBgBar={true}
                      size={Size.sm}
                      isRearrangeableByDefault={true}
                      onRearrange={rearrangePanels}
                      onSwitch={(e) => {
                        goal.switchPanel(e.detail);
                      }}
                    >
                      {#snippet right()}
                        <div>
                          {#if $goal.accessMode === AccessMode.FULL && !isConstrainedWidth}
                            <ResourceInlineCloseButton
                              accessMode={$goal.accessMode}
                              parentBgIndex={2}
                              id={$goal.id}
                            />
                          {/if}
                        </div>
                      {/snippet}
                    </PanelSwitcher>
                    {#if isConstrainedWidth}
                      <div
                        class="w-10 bg-gradient-to-r from-bgs2/20 to-bgs2 absolute right-0 top-0 h-full"
                      ></div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
            <div
              class={cn("flex-1 overflow-auto", {
                "pt-4 w-full": isConstrainedWidth
              })}
            >
              <GoalPanelContentResolver
                {goal}
                {isConstrainedWidth}
                {isThreeColumned}
                bind:status
              />
              {#if isConstrainedWidth}
                <ScrollViewBottomSpacer />
              {/if}
            </div>
          </main>
        </div>
      {/if}
    </CustomColorPropagator>

    <ComponentBaseLayer
      subscribeToRecords={[id]}
      onChange={(e) => {
        try {
          if ("params" in e && e.params?.record && "parent" in e.params.record) {
            isReady = false;
            initPromise = initialize();
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
  {:catch}
    <EmptyStatusView mainText={ErrorMessage.DEFAULT} />
  {/await}
</div>
