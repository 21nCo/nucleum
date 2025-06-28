<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import CalendarOverviewPanelNucleus from "./CalendarOverviewPanelNucleus.svelte";
  import CalendarOverviewPanelPointron from "./CalendarOverviewPanelPointron.svelte";
  export let date: Date;
  export let isRewind: boolean = false;
  $: product = $appStore.product;
</script>

<div class="w-full h-full flex flex-grow">
  {#if product === Product.POINTRON}
    <CalendarOverviewPanelPointron {date} {isRewind} />
  {:else if product === Product.NUCLEUS}
    <CalendarOverviewPanelNucleus {date} {isRewind} />
  {:else}
    <ComingSoonView />
  {/if}
</div>
