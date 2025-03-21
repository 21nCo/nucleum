<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  import CalendarOverviewPanelPointron from "./CalendarOverviewPanelPointron.svelte";
  export let date: Date;
  $: product = $appStore.product;
</script>

<div class="w-full h-full">
  {#if product === Product.POINTRON}
    <CalendarOverviewPanelPointron {date} />
  {:else}
    <ComingSoonView />
  {/if}
</div>
