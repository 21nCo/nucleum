<script lang="ts">
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Product } from "@21n/products/product.type";
  import CalendarOverviewPanelNucleus from "@21n/components/calendar/column/overview/CalendarOverviewPanelNucleus.svelte";
  import CalendarOverviewPanelPointron from "@21n/components/calendar/column/overview/CalendarOverviewPanelPointron.svelte";
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
