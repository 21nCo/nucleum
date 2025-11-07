<script lang="ts">
  import {
    ActiveGoalStore,
    resolvePanelOptions,
    type IActiveGoalStore
  } from "@21n/components/goals/goal.store";
  import PageLoadingPulse from "@21n/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import view from "@21n/stores/view.store";
  import { resizeListener } from "@21n/actions/resize.action";
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
  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  export let status: IInlineStatus | undefined = undefined;
  let containerWidth = 0;
  let goal: IActiveGoalStore = ActiveGoalStore.resolve(id);
  let isReady = false;

  $: isConstrainedWidth = resolveIfConstrainedWidth(
    $goal?.accessMode ?? accessMode,
    containerWidth,
    $view.isConstrainedWidth
  );

  $: tabs = resolvePanelOptions($goal, isConstrainedWidth);

  onDestroy(() => {
    const latestAccessMode = $goal?.accessMode ?? accessMode;
    ActiveGoalStore.destroy(id, latestAccessMode);
  });

  async function initialize() {
    const editSearchParam = $page.url.searchParams.get(AppSearchParam.EDIT);
    const linkSearchParam = $page.url.searchParams.get(AppSearchParam.LINK);
    const panel = resolvePanelParam(id, "Goal.svelte");
    await goal.init(accessMode, {
      isInEditMode: editSearchParam === "true",
      linkSearchParam: linkSearchParam ?? undefined,
      panel: panel ?? ResourcePanelType.DEFAULT
    });
    isReady = true;
    return goal.afterInit();
  }

  function resolveIfConstrainedWidth(
    accessMode: ResourceAccessMode,
    containerWidth: number,
    isViewConstrainedWidth: boolean
  ) {
    return (
      isViewConstrainedWidth ||
      accessMode === ResourceAccessMode.SPLIT ||
      accessMode === ResourceAccessMode.FSPLIT ||
      accessMode === ResourceAccessMode.INLINE ||
      containerWidth < 800
    );
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
</script>

<div
  class="flex w-full h-full overflow-auto"
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  {#await initialize()}
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
          <main class="flex flex-col flex-1 overflow-auto">
            {#if isConstrainedWidth}
              <div
                class={cn(
                  "relative flex flex-col w-full overflow-auto gap-3 cw:bg-bgs2 otop:pt-12 shrink-0 border-b border-brs3",
                  {
                    "bg-bgs2": isConstrainedWidth
                  }
                )}
              >
                <GoalTitleRow {goal} isConstrainedWidth={true} bind:status />
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
                    on:rearrange={rearrangePanels}
                    on:switch={(e) => {
                      goal.switchPanel(e.detail);
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
            {/if}
            <div
              class={cn("flex-1 overflow-auto", {
                "pt-4 w-full": isConstrainedWidth
              })}
            >
              <GoalPanelContentResolver
                {goal}
                {isConstrainedWidth}
                bind:status
              />
              {#if isConstrainedWidth}
                <ScrollViewBottomSpacer />
              {/if}
            </div>
          </main>
          {#if !isConstrainedWidth}
            <GoalPanelSwitcher panels={tabs} {goal} {isConstrainedWidth} />
          {/if}
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
  {:catch}
    <EmptyStatusView mainText={ErrorMessage.DEFAULT} />
  {/await}
</div>
