<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, untrack } from "svelte";
  import { appLoadingState } from "@nucleum/shared-state/app-context/app.store";
  import NavigationLayout from "@nucleum/shell/navigation/NavigationLayout.svelte";
  import FullScreenOverlayLayer from "@nucleum/shell/overlays/FullScreenOverlayLayer.svelte";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { page } from "$app/stores";
  import LeftNav from "../chrome/WiredLeftNav.svelte";
  import TopNav from "../chrome/WiredTopNav.svelte";
  import type { TopNavPanelAction } from "@nucleum/shell/topNav/panel-actions";

  let {
    children,
    topnav: topnavContent,
    topnavIndicators = undefined,
    panelActions = [],
    main
  }: {
    children?: Snippet;
    topnav?: Snippet;
    topnavIndicators?: Snippet;
    panelActions?: TopNavPanelAction[];
    main?: Snippet;
  } = $props();

  const isLoaded = $derived(
    $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded
  );

  onMount(() => {
    $appLoadingState.isLocalLoaded = true;
  });

  $effect(() => {
    if (!isLoaded) return;
    return untrack(() => {
      const stopLegacyUrls = navigation.watchLegacyUrls(page);
      const stopAccessTrail = navigation.watchAccessTrail(page);
      return () => {
        stopLegacyUrls();
        stopAccessTrail();
      };
    });
  });
</script>

{#snippet leftNav(isHidePanel: boolean)}
  <LeftNav {isHidePanel} />
{/snippet}

{#snippet topNav()}
  <TopNav topnav={topnavContent} indicators={topnavIndicators} {panelActions} />
{/snippet}

{#if isLoaded}
  <NavigationLayout {leftNav} {topNav} {main}>
    {@render children?.()}
  </NavigationLayout>
  <FullScreenOverlayLayer />
{/if}
