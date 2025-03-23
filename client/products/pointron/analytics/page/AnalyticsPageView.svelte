<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { analyticsConfigStore } from "../analytics.store";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import AnalyticsCardView from "./AnalyticsCardView.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { onMount } from "svelte";
  import type { AnalyticsPage } from "../analytics.types";

  export let id: string;
  let goals: IGoalThumb[] = [];
  let isLoading = true;
  let config: AnalyticsPage | undefined;

  async function addCard() {
    analyticsConfigStore.addCard(id);
    refreshConfig();
  }

  onMount(() => {
    refreshConfig();
    refreshGoals();
  });

  async function refreshGoals() {
    isLoading = true;
    goals = await goalStore.selectMany({}, { isIncludeSubItems: true });
    isLoading = false;
  }

  function refreshConfig() {
    config = $analyticsConfigStore.pages.find((x) => x.id === id);
  }
</script>

{#if config && !isLoading}
  <div
    class={cn("flex h-full max-h-full p-2", {
      "flex-col gap-3 overflow-auto": $view.isPortrait,
      "flex-wrap gap-2": !$view.isPortrait
    })}
  >
    {#each config.cards as card, index (card.id)}
      <AnalyticsCardView
        {card}
        {goals}
        position={{ index, total: config.cards.length }}
        pageId={id}
        on:removed={() => refreshConfig()}
      />
    {/each}
    {#if $isInEditMode && config.cards.length < 10}
      <div>
        <button
          class={cn(
            "border-2 border-dotted border-brs3 hover:bg-bgs2 rounded-md grow flex flex-col gap-1 justify-center items-center",
            {
              "w-full": $view.isPortrait,
              "w-60": !$view.isPortrait
            }
          )}
          style="height: calc(50vh - 2.85rem)"
          on:click={addCard}
        >
          <Icon icon="plus-circled" />
          <Button label="Add card" style={ButtonStyle.PLAIN} />
        </button>
      </div>
    {/if}
    {#if $view.isPortrait}
      <ScrollViewBottomSpacer />
    {/if}
  </div>
{:else}
  <EmptyStatusView
    isLoadingState={isLoading}
    mainText={!config
      ? "Geez Something went wrong!"
      : "Shoot! No cards configured."}
    subText={!config
      ? "Please try again after sometime or chat with us"
      : "Please click on edit and add cards to display them here."}
  />
{/if}
