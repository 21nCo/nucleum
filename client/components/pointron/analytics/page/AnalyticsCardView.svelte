<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TimePeriodPicker from "$lib/client/elements/datetime/timeperiodpicker/TimePeriodPicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { timePeriodLabel } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    AnalyticsCardType,
    type AnalyticsCard,
    type AnalyticsDataRecord
  } from "../analytics.types";
  import { analyticsConfigStore } from "../analytics.store";
  import { createEventDispatcher } from "svelte";
  import CardSelector from "./CardSelector.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import GroupingAndFilters from "./GroupingAndFilters.svelte";
  import CardResolver from "./CardResolver.svelte";
  import Analytics from "../Analytics.svelte";
  export let card: AnalyticsCard;
  export let position: { index: number; total: number };
  export let pageId: string;
  export let data: AnalyticsDataRecord[];
  export let previousTimePeriodData: AnalyticsDataRecord[] = [];
  export let goalColors: any;
  const dispatch = createEventDispatcher();
  $: timePeriod = timePeriodLabel(card.period);
  $: isCarbonChart =
    card.type === AnalyticsCardType.PIE ||
    card.type === AnalyticsCardType.DONUT ||
    card.type === AnalyticsCardType.AREA ||
    card.type === AnalyticsCardType.LINE;
  function onRemoveClick() {
    analyticsConfigStore.removeCard(pageId, card.id);
    dispatch("change", card);
  }
  function onTimePeriodChange(e: CustomEvent) {
    console.log({ e, period: card.period });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      period: e.detail
    });
    dispatch("change", card);
  }
  function onCardTypeChange(e: CustomEvent) {
    console.log({ e, type: card.type });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card,
      type: e.detail
    });
    dispatch("change", card);
  }
  function onGroupingAndFilterChange(e: CustomEvent) {
    console.log({ e, grouping: card.grouping });
    analyticsConfigStore.updateCardConfig(pageId, {
      ...card
    });
    dispatch("change", card);
  }
</script>

<div
  class={cn("flex flex-col grow border border-brs2 rounded-md", {
    "w-full h-96 p-2": $view.isPortrait,
    "h-[32rem]": $view.isPortrait && $isInEditMode,
    "min-w-1/2 w-1/2 p-4 bg-bgs2": !$view.isPortrait,
    "w-4/5": position.total === 1 && !$view.isPortrait,
    "w-1/3":
      !$view.isPortrait &&
      (card.type === AnalyticsCardType.PIE ||
        card.type === AnalyticsCardType.DONUT ||
        card.type === AnalyticsCardType.TOP_N ||
        card.type === AnalyticsCardType.METRICS),
    "border border-brs2": $isInEditMode
  })}
  style={!$view.isPortrait
    ? position.total === 1
      ? "height: calc(100vh - 8rem);"
      : "height: calc(50vh - 2.85rem);"
    : ""}
>
  <header
    class={cn("w-full", {
      "h-6": !$view.isPortrait || ($view.isPortrait && !$isInEditMode),
      "h-32": $view.isPortrait && $isInEditMode
    })}
  >
    {#if $isInEditMode}
      <div
        class={cn("w-full", {
          "flex flex-col gap-3": $view.isPortrait,
          "flex justify-between items-center": !$view.isPortrait
        })}
      >
        <span
          class={cn({
            "w-full": $view.isPortrait,
            "w-54": !$view.isPortrait
          })}
        >
          <TextInput
            bind:value={card.label}
            placeholder="chart title"
            style={InputStyle.PLAIN}
          />
        </span>
        <span class="flex flex-wrap gap-2">
          {#if card.type != AnalyticsCardType.TARGETS}
            <span class="w-48">
              <TimePeriodPicker
                bind:period={card.period}
                on:change={onTimePeriodChange}
              />
            </span>
          {/if}
          <CardSelector
            bind:selected={card.type}
            on:select={onCardTypeChange}
          />
          <GroupingAndFilters {card} on:select={onGroupingAndFilterChange} />
          <Button
            icon="cross-circled"
            tooltip="Remove"
            size={Size.md}
            on:click={onRemoveClick}
          />
        </span>
      </div>
    {:else}
      <div class="flex w-full justify-between items-center">
        <span class="font-medium">
          {card.type === AnalyticsCardType.TARGETS
            ? "Targets"
            : card.label ?? timePeriod}
        </span>
        {#if card.type != AnalyticsCardType.TARGETS && card.label}
          <span class="text-fgs2 text-b2">
            {timePeriod}
          </span>
        {/if}
      </div>
    {/if}
  </header>
  <div
    class={cn("flex w-full items-center justify-center", {
      "h-[24rem]": $view.isPortrait && $isInEditMode,
      "h-[22.5rem]": $view.isPortrait && !$isInEditMode
    })}
    style={!$view.isPortrait ? "height: calc(100% - 2rem)" : ""}
  >
    {#if $isInEditMode}
      <div
        class={cn("w-full", {
          "h-5/6": !$view.isPortrait,
          "h-4/5": $view.isPortrait && isCarbonChart,
          "h-full": $view.isPortrait && !isCarbonChart
        })}
      >
        <CardResolver {card} {data} {goalColors} {previousTimePeriodData} />
      </div>
    {:else}
      <CardResolver {card} {data} {goalColors} {previousTimePeriodData} />
    {/if}
  </div>
</div>
