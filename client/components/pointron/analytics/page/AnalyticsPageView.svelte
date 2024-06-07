<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    analyticsConfigStore,
    resolveAnalyticsPageStore,
    type AnalyticsPageStoreType
  } from "../analytics.store";
  import ScrollViewBottomSpacer from "$lib/client/elements/ScrollViewBottomSpacer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import AnalyticsCardView from "./AnalyticsCardView.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  export let id: string;
  let refreshId = new Date().getTime();
  let config = $analyticsConfigStore.pages.find((x) => x.id === id);
  let store: AnalyticsPageStoreType;
  if (config) {
    store = resolveAnalyticsPageStore(config);
    store.refresh();
  }
  $: console.log($store.data?.cards);
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
      class={cn("flex gap-2 h-full max-h-full p-2", {
        "flex-col overflow-auto": $view.isPortrait,
        "flex-wrap": !$view.isPortrait
      })}
    >
      {#each $store.config.cards as card, index}
        <AnalyticsCardView
          {card}
          data={$store.data?.cards[index]}
          previousTimePeriodData={$store.data?.previous[index]}
          goalColors={$store.data?.colors}
          position={{ index, total: $store.config.cards.length }}
          pageId={id}
          on:change={onCardConfigChange}
        />
      {/each}
      {#if $isInEditMode && $store.config.cards.length < 4}
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
    isLoadingState={$store.isRefreshing}
    mainText="Shoot! No cards configured."
    subText="Please click on edit and add cards to display them here."
  />
{/if}
