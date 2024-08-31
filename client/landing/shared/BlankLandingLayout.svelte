<script lang="ts">
  import RightPanel from "./RightPanel.svelte";
  import LandingBaseLayer from "../LandingBaseLayer.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import TopNavBar from "./TopNavBar.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "./Landing.types";

  export let isProductsPage = true;
  export let topNavBarValues: ITopNavBar;

  const navBarHeight = 66;
</script>

<LandingBaseLayer>
  {#if isProductsPage}
    <LeftPanel />
  {/if}
  <div class="border w-full overflow-auto">
    <TopNavBar {topNavBarValues} {navBarHeight} />
    <slot />
  </div>
  <RightPanel />
</LandingBaseLayer>
