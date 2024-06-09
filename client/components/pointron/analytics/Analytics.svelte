<script lang="ts">
  import {
    startTouch,
    moveTouch,
    swipeIsRefreshing
  } from "$lib/client/utils/touchGesture";
  import Button from "$lib/client/elements/button/Button.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { DropDownStyle } from "$lib/client/types/dropdownItem.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import Horizons from "./Horizons.svelte";
  import TargetGuages from "./targets/TargetGuages.svelte";
  import { AnalyticsPersistence } from "$lib/client/components/pointron/analytics/analytics.persistence";
  import type { TimeScale } from "$lib/client/types/time.type";
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  let selectedView = 0;
  let isShowFilters = true;
  let isLoadingState = false;
  const aggPersistance = new AnalyticsPersistence();
  let data: {
    horizons: {
      charts: any[];
      colors: { label: string; color: number }[];
    };
    targetsAndStreak: {
      scale: TimeScale;
      actual: number;
      target: number;
      streak: { value: number; lastWhenStreakBroke: string };
      isCurrentAchieved: boolean;
    }[];
  };

  async function fetchAnalytics() {
    isLoadingState = true;
    data = await aggPersistance.fetchAnalytics(
      $pointronPreferences.horizonCharts
    );
    //if (data) console.log("Horizons Fetched ", data);
    //else console.log("error happened during surreal fetch");
    isLoadingState = false;
  }
  onMount(async () => {
    await fetchAnalytics();
  });
</script>

{#if $view.isPortrait}
  <div
    id="Analyticsouter"
    on:touchstart={startTouch}
    on:touchmove={() =>
      moveTouch(
        event,
        undefined,
        undefined,
        fetchAnalytics,
        undefined,
        undefined
      )}
    class="flex flex-col w-full h-full justify-start items-center"
  >
    <div class="hidden" class:animate-spin={$swipeIsRefreshing}>↻</div>
    <div class="flex px-4 pt-2 pb-4 gap-8 w-full items-center justify-between">
      <div>
        <!-- <DropDown
            items={[
              { label: "Horizons view", value: 0 },
              { label: "Detailed view", value: 1 },
            ]}
            parentBackgroundIndex={1}
            style={DropDownStyle.PANEL_SWITCH}
            bind:value={selectedView}
          /> -->
        <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Analytics" />
      </div>
      <div class="flex gap-2">
        {#if $isInEditMode}
          <Button
            label="reset"
            size={Size.xs}
            on:click={pointronPreferences.resetHorizonChartConfiguration}
          />
        {/if}
        <EditToggleButton />
      </div>
    </div>
    {#if data}
      <div
        id="Analyticsinner"
        on:touchstart|stopPropagation={startTouch}
        class="flex flex-col w-full overflow-y-auto"
      >
        <div class="w-full flex flex-col gap-6 pb-4">
          <!-- <div class="flex px-4">
            <Text style={TextStyle.SECTION_HEADING} content="Targets" />
          </div> -->
          {#if isValidArrayWithData(data?.targetsAndStreak)}
            <TargetGuages size={Size.md} data={data?.targetsAndStreak} />
          {:else}
            <EmptyStatusView
              size={Size.sm}
              mainText="No targets set"
              subText="Set targets to see them here"
              actionText="Set targets"
              on:click={() => {
                appStore.gotoPath("/cp/targets");
              }}
            />
          {/if}
        </div>
        <Divider />
        {#if selectedView === 0}
          <Horizons chartData={data.horizons} />
        {:else}
          <!-- <Detailed /> -->
        {/if}
      </div>
    {:else}
      <EmptyStatusView {isLoadingState} loadingText="Loading..." />
    {/if}
  </div>
{:else}
  <div class="flex w-full h-full">
    <div class="flex flex-col w-full h-full items-center p-4">
      <div class="flex gap-8 w-full justify-between h-16">
        <!-- <PanelSwitcher
            items={["Horizons view", "Detailed view"]}
            bind:selectedIndex={selectedView}
            style={PanelSwitcherStyle.BAR}
          /> -->
        <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Analytics" />
        <div class="flex gap-4 justify-center items-center">
          {#if $isInEditMode}
            <Button
              label="reset"
              size={Size.xs}
              on:click={pointronPreferences.resetHorizonChartConfiguration}
            />
          {/if}
          <EditToggleButton />
        </div>
      </div>
      {#if data}
        <div class="flex grow">
          {#if selectedView === 0}
            <Horizons chartData={data.horizons} />
          {:else}
            <!-- <Detailed /> -->
          {/if}
        </div>
      {:else}
        <EmptyStatusView isLoadingState={true} loadingText="Loading..." />
      {/if}
    </div>
    {#if isShowFilters}
      <div class="border-l-2 border-bgs2" />
      <div class="flex flex-col h-full gap-10 py-4 w-60">
        <div class="flex p-4">
          <Text style={TextStyle.PANEL_HEADING} content="Targets" />
        </div>
        {#if isValidArrayWithData(data?.targetsAndStreak)}
          <div class="flex flex-col gap-8">
            <TargetGuages size={Size.md} data={data?.targetsAndStreak} />
          </div>
        {:else}
          <EmptyStatusView
            size={Size.sm}
            mainText="No targets set"
            subText="Set targets to see them here"
            actionText="Set targets"
            on:click={() => {
              appStore.gotoPath("/cp/targets");
            }}
          />
        {/if}
        <!-- <Filters /> -->
      </div>
    {/if}
  </div>
{/if}

<style>
  .animate-spin {
    display: block;
    position: absolute;
    top: 4%;
    left: 48%;
  }
</style>
