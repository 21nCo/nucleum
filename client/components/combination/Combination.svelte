<script lang="ts">
  import { ActiveCombinationStore } from "./combination.store";
  import { CombinationType } from "./combination.type";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { onMount } from "svelte";
  import SideNavCombination from "./layouts/SideNavCombination.svelte";

  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;

  let combination = ActiveCombinationStore.resolve(id);
  let isReady = false;

  onMount(() => {
    combination.init(accessMode);
    isReady = true;
  });
</script>

{#if !$combination || $combination.isPageLoading || !isReady}
  <div class="w-full h-full p-4">
    <PageLoadingPulse />
  </div>
{:else if $combination.type === CombinationType.SIDENAV}
  <SideNavCombination {combination} {accessPoint} {accessMode} />
{:else}
  <div class="flex items-center justify-center w-full h-full">
    <div class="text-fgs3">
      Layout type "{$combination.type}" is not yet implemented
    </div>
  </div>
{/if}
