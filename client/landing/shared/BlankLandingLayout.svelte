<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./TopNavBar.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "./Landing.types";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";

  export let isProductsPage = true;
  export let topNavBarValues: ITopNavBar;

  const navBarHeight = 66;
  onMount(async () => {
    view.update(window.innerWidth, window.innerHeight);
  });
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };
</script>

<LandingBaseLayer>
  {#if isProductsPage}
    <LeftPanel />
  {/if}
  <div class="w-full overflow-auto">
    <TopNavBar {topNavBarValues} {navBarHeight} />
    <slot />
  </div>
  <RightPanel />
</LandingBaseLayer>

<svelte:window on:resize={windowResizeListener} />
