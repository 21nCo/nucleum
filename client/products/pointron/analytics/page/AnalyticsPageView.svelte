<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    analyticsConfigStore,
    resolveAnalyticsPageStore,
    type AnalyticsPageStoreType
  } from "../analytics.store";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import AnalyticsCardView from "./AnalyticsCardView.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  export let id: string;
  let refreshId = new Date().getTime();
  let config = $analyticsConfigStore.pages.find((x) => x.id === id);
  let store: AnalyticsPageStoreType;
  if (config) {
    store = resolveAnalyticsPageStore(config);
    store.refresh();
  }
  async function onCardConfigChange() {
    await store.refresh();
    refreshId = new Date().getTime();
  }
  async function addCard() {
    analyticsConfigStore.addCard(id);
    await store.refresh();
    refreshId = new Date().getTime();
  }
</script>

{#if (isValidArrayWithData($store?.data?.cards) && !$store.isRefreshing) || $isInEditMode}
  {#key `${refreshId}-${$isInEditMode}`}
    <div
      class={cn("flex h-full max-h-full p-2", {
        "flex-col gap-3 overflow-auto": $view.isPortrait,
        "flex-wrap gap-2": !$view.isPortrait
      })}
    >
      {#each $store.config.cards as card, index}
        {#if $store.data?.cards?.[index]}
          <AnalyticsCardView
            {card}
            data={$store.data?.cards?.[index]}
            previousTimePeriodData={$store.data?.previous?.[index]}
            goalColors={$store.data?.colors}
            position={{ index, total: $store.config.cards.length }}
            pageId={id}
            on:change={onCardConfigChange}
          />
        {/if}
      {/each}
      {#if $isInEditMode && $store.config.cards.length < 10}
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
  {/key}
{:else}
  <EmptyStatusView
    isLoadingState={$store?.isRefreshing}
    mainText={$store?.data?.cards === undefined
      ? "Geez Something went wrong!"
      : "Shoot! No cards configured."}
    subText={$store?.data?.cards === undefined
      ? "Please try again after sometime or chat with us"
      : "Please click on edit and add cards to display them here."}
  />
{/if}
