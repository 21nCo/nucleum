<script lang="ts">
  import { page } from "$app/stores";
  import { currentGoal } from "$lib/client/products/pointron/goals/goal.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Direction } from "$lib/client/types/direction.enum";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import { GoalTab } from "$lib/client/types/goalTabs.enum";
  import { Size } from "$lib/client/types/size.enum";
  import {
    PanelSwitcherStyle,
    VerticalSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import GoalPanelResolver from "./GoalPanelResolver.svelte";
  import HeaderV2 from "./HeaderV2.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  let selectedTab: GoalTab = GoalTab.Overview;
  let isRefreshing = false;
  let isGoalLoaded = false;
  let isUpdateInProgress = false;
  let defaultTabs: GoalTab[] = [GoalTab.Overview, GoalTab.Analytics];

  $: id = $page.params.route ?? "";
  $: if (id) {
    setGoal();
  }
  async function setGoal() {
    isGoalLoaded = false;
    isRefreshing = true;
    const result = await currentGoal.load(id);
    if (result) {
      isGoalLoaded = true;
    }
    isRefreshing = false;
  }
</script>

<CustomColorPropagator
  class="h-full w-full"
  color={$currentGoal.color ?? $currentGoal.parent?.color}
>
  {#if isRefreshing || !isGoalLoaded}
    <EmptyStatusView
      loadingAnimation={LoadingAnimationType.PAGE_PULSE}
      isLoadingState={isRefreshing}
      mainText="Geez! Goal details not found."
      subText="Please try again after some time."
    />
  {:else if $view.isPortrait && isGoalLoaded}
    <div class="flex flex-col h-full p-2">
      <div class="p-2">
        <HeaderV2 />
      </div>
      <div class="flex flex-col flex-grow p-2 overflow-y-auto">
        <GoalPanelResolver {selectedTab} />
      </div>
    </div>
    <BottomFloat isAppMenuHidden={true}>
      <PanelSwitcher
        bind:value={selectedTab}
        items={defaultTabs}
        style={PanelSwitcherStyle.TRAIN}
      />
    </BottomFloat>
  {:else if isGoalLoaded}
    <div class="flex w-full h-full justify-center p-4 2xl:p-8 pt-6 2xl:pt-8">
      <div class="flex h-full w-full max-w-7xl">
        <!-- <header class="px-4 xl:px-6 2xl:px-12">
          <HeaderV2 />
        </header> -->
        <div class="flex flex-col gap-2 2xl:gap-6 h-full flex-grow">
          <div class="px-4 xl:px-6 2xl:px-12">
            <HeaderV2 />
          </div>
          <div class="px-4 xl:px-6 2xl:px-12 flex-grow overflow-auto">
            <GoalPanelResolver {selectedTab} />
          </div>
        </div>
        <aside>
          <VerticalSwitcher
            items={[
              {
                icon: "rectangle-group",
                label: GoalTab.Overview
              },
              {
                icon: "chart",
                label: GoalTab.Analytics
              }
              // {
              //   icon: "clock",
              //   label: GoalTab.LOGS
              // }
            ]}
            bind:selected={selectedTab}
            itemProps={{
              activeStatusPlacement: Direction.Left
            }}
            style={VerticalSwitcherStyle.BAR}
          />
        </aside>
      </div>
    </div>
  {/if}
  {#if $isInEditMode && $currentGoal.pendingChanges}
    <BottomFloat>
      <div
        class="bg-bgs2 border-2 border-brs3 h-16 lg:h-20 w-80 xl:w-96 rounded-full flex gap-2 justify-center items-center"
      >
        <Button
          label="Save changes"
          type={ButtonVariant.PRIMARY}
          size={Size.sm}
          isLoading={isUpdateInProgress}
          on:click={async () => {
            isUpdateInProgress = true;
            await currentGoal.update();
            isUpdateInProgress = false;
          }}
        />
        <Button
          label="Discard"
          parentBgIndex={2}
          size={Size.sm}
          on:click={() => {
            currentGoal.restore();
          }}
        />
      </div>
    </BottomFloat>
  {/if}
</CustomColorPropagator>
