<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, untrack } from "svelte";
  import { appLoadingState, appStore } from "@nucleum/shared-state/app-context/app.store";
  import context from "@nucleum/client/runtime/context.store";
  import CommandModePage from "@nucleum/surfaces/commandBar/CommandModePage.svelte";
  import NavigationLayout from "@nucleum/shell/navigation/NavigationLayout.svelte";
  import FullScreenOverlayLayer from "@nucleum/shell/overlays/FullScreenOverlayLayer.svelte";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  import { resolveLayoutRoute } from "@nucleum/shell/navigation/layout-route";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { pageScroll } from "@nucleum/shell/navigation/page-scroll";
  import { isCommandModeLayout } from "@nucleum/shell/navigation/command-mode-layout";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { page } from "$app/stores";
  import LeftNav from "../chrome/WiredLeftNav.svelte";
  import TopNav from "../chrome/WiredTopNav.svelte";
  import { pageLayerAttributes } from "@nucleum/shell/navigation/page-layer";

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

  const commandModePageId = $derived(resolveLayoutRoute($page.url).pop?.id);

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

  let commandHomeRef = $state<HTMLElement | undefined>(undefined);
  let commandHomeFocus: HTMLElement | undefined;

  const isCommandHomeCovered = $derived(!!commandModePageId);

  $effect.pre(() => {
    if (!isCommandHomeCovered) return;
    untrack(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && commandHomeRef?.contains(active))
        commandHomeFocus = active;
    });
  });

  $effect(() => {
    if (isCommandHomeCovered) return;
    const target = commandHomeFocus;
    commandHomeFocus = undefined;
    const active = document.activeElement;
    const isFocusLost =
      !active || active === document.body || !active.isConnected;
    if (isFocusLost && target?.isConnected) target.focus();
  });
</script>

{#snippet leftNav(isHidePanel: boolean)}
  <LeftNav {isHidePanel} />
{/snippet}

{#snippet topNav()}
  <TopNav topnav={topnavContent} indicators={topnavIndicators} />
{/snippet}

{#if isLoaded}
  {#if isCommandModeLayout($appStore.interactionMode, $context.embed)}
    <div
      class="contents"
      bind:this={commandHomeRef}
      inert={isCommandHomeCovered}
      aria-hidden={isCommandHomeCovered ? "true" : undefined}
    >
      <CommandModePage />
    </div>
    {#if commandModePageId}
      <div
        class="fixed inset-0 w-full h-full bg-bgs1 z-40"
        data-testid="resource-record-surface"
        data-full-screen="true"
        use:pageScroll={commandModePageId}
        {...pageLayerAttributes}
      >
        {#key commandModePageId}
          <ResourceResolver
            id={commandModePageId}
            accessMode={AccessMode.PAGE}
          />
        {/key}
      </div>
    {/if}
  {:else}
    <NavigationLayout {leftNav} {topNav} {main}>
      {@render children?.()}
    </NavigationLayout>
  {/if}
  <FullScreenOverlayLayer />
{/if}
