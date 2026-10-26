<svelte:options runes={true} />

<script lang="ts">
  import AppMenuSwitcher from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import { player } from "@nucleum/shell/overlays/modal.store";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { page } from "$app/stores";
  import { cn } from "@21n/ui/environment/presentation";
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";

  const ComponentResolver = requireActionRenderer();

  let {
    capture = undefined
  }: {
    /** Quick capture slot forwarded to the portrait app menu. */
    capture?: Snippet;
  } = $props();

  let testingInMobileBrowser: boolean = false;
  let currentRouteParam = $state<string | undefined>(undefined);
  let currentRouteId = $state<string | undefined>(undefined);

  onMount(() => {
    const unsubscribe = page.subscribe((p) => {
      currentRouteParam = p?.params?.route;
      currentRouteId = p?.route?.id ?? undefined;
    });
    return () => unsubscribe?.();
  });
</script>

<div
  class="absolute {testingInMobileBrowser
    ? 'bottom-14'
    : 'bottom-0'} flex flex-col justify-center items-center z-30 w-full"
>
  {#if $player.isMiniOn}
    <ComponentResolver path={$player.action} />
  {/if}

  <div
    class="w-full min-w-min pb-8 pt-3 glassmenubar bg-bgs1 border-t border-brs2"
  >
    <AppMenuSwitcher
      layoutContext={LayoutContext.PORTRAIT}
      parentBackgroundIndex={0}
      {capture}
    />
  </div>
</div>
