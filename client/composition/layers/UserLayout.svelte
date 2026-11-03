<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "@nucleum/shared-state/app-context/app.store";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { InteractionMode } from "@21n/ui/elements/keyboard/interaction-mode.type";
  import CommandModePage from "@nucleum/surfaces/commandBar/CommandModePage.svelte";
  import NavigationLayout from "@nucleum/shell/navigation/NavigationLayout.svelte";
  import FullScreenOverlayLayer from "@nucleum/shell/overlays/FullScreenOverlayLayer.svelte";
  import LeftNav from "../chrome/WiredLeftNav.svelte";
  import TopNav from "../chrome/WiredTopNav.svelte";

  let {
    children,
    topnav: topnavContent,
    topnavIndicators = undefined,
    main
  }: {
    children?: Snippet;
    topnav?: Snippet;
    topnavIndicators?: Snippet;
    main?: Snippet;
  } = $props();

  onMount(() => {
    $appLoadingState.isLocalLoaded = true;
  });
</script>

{#snippet leftNav(isHidePanel: boolean)}
  <LeftNav {isHidePanel} />
{/snippet}

{#snippet topNav()}
  <TopNav topnav={topnavContent} indicators={topnavIndicators} />
{/snippet}

{#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
  {#if $appStore.interactionMode === InteractionMode.AGENT && $context.embed !== Embed.HANDSET}
    <CommandModePage>
      {@render children?.()}
    </CommandModePage>
  {:else}
    <NavigationLayout {leftNav} {topNav} {main}>
      {@render children?.()}
    </NavigationLayout>
  {/if}
  <FullScreenOverlayLayer />
{/if}
