<svelte:options runes={true} />

<script lang="ts">
  import { resolveLayoutRoute } from "@nucleum/shell/navigation/layout-route";
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { appEvents } from "@nucleum/shared-state/events/app-events.store";
  import context from "@nucleum/client/runtime/context.store";
  import view from "@21n/ui/environment/view.store";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { UIState } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import AppSplitView from "@nucleum/shell/AppSplitView.svelte";
  import RightPanel from "@nucleum/shell/rightPanel/RightPanel.svelte";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { page } from "$app/stores";
  import RightSplit from "@nucleum/shell/RightSplit.svelte";
  import PortraitBackControl from "@nucleum/shell/navigation/PortraitBackControl.svelte";
  import {
    restorePageScroll,
    savePageScroll
  } from "@nucleum/shell/navigation/page-scroll";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { cn } from "@21n/ui/environment/presentation";
  import { pageLayerAttributes } from "@nucleum/shell/navigation/page-layer";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import ContextZonePaneScope from "@nucleum/shell/topNav/contextZone/ContextZonePaneScope.svelte";
  import {
    ContextZoneLayer,
    contextZone
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  const ComponentResolver = requireActionRenderer();
  let {
    children,
    topNav,
    leftNav,
    main
  }: {
    children?: Snippet;
    topNav: Snippet;
    leftNav: Snippet<[boolean]>;
    main?: Snippet;
  } = $props();
  let isHideLeftNavBar = $state(refreshSidebarState());

  let isMaxParam = $state(
    new URLSearchParams(window.location.search).get(AppSearchParam.MAX) ===
      "true"
  );
  let besidePage = $state<string | undefined>(undefined);
  let pageLayerRef = $state<HTMLElement | undefined>(undefined);
  let renderedPageId: string | undefined;
  let rightPanel = $state<IAction | undefined>(undefined);
  let pop = $state<{ id: IRecordId; action: IAction } | undefined>(undefined);
  let mainPath = $state<string | undefined>(undefined);
  let popId = $derived.by(() => {
    if (!pop || typeof pop !== "object") return undefined;
    return typeof pop.id === "string" && pop.id.length > 0 ? pop.id : undefined;
  });
  const isBaseCovered = $derived(!!popId || !!mainPath);
  const isPageFullScreen = $derived(
    isMaxParam && !!popId && !mainPath && !$view.isPortrait
  );
  const isOverlayFullScreen = $derived(isMaxParam && !!mainPath);
  const isMaxMode = $derived(isPageFullScreen || isOverlayFullScreen);

  let scrollSaveFrame = 0;

  $effect(() => {
    contextZone.setVisibleLayers(
      popId
        ? [ContextZoneLayer.PAGE, ContextZoneLayer.BESIDE_PAGE]
        : mainPath
          ? [ContextZoneLayer.OVERLAY]
          : [ContextZoneLayer.BASE, ContextZoneLayer.BESIDE_BASE]
    );
  });

  $effect(() => () => contextZone.setVisibleLayers(undefined));

  function onPageScroll() {
    cancelAnimationFrame(scrollSaveFrame);
    const id = renderedPageId;
    const root = pageLayerRef;
    if (!id || id !== popId) return;
    scrollSaveFrame = requestAnimationFrame(() => savePageScroll(root, id));
  }

  $effect(() => {
    const next = popId;
    const root = pageLayerRef;
    if (!next || next === renderedPageId) return;
    renderedPageId = next;
    return restorePageScroll(root, next);
  });

  $effect(() => {
    if (!popId) renderedPageId = undefined;
  });

  onMount(() => {
    const uiStateSub = uiState.subscribe(() => {
      isHideLeftNavBar = refreshSidebarState();
    });
    const pageSub = page.subscribe((p) => {
      const route = resolveLayoutRoute(p?.url);
      isMaxParam = route.isMaxMode;
      rightPanel = route.rightPanel;
      pop = route.pop;
      mainPath = route.mainPath;
      besidePage =
        p?.url?.searchParams.get(AccessMode.BESIDE_PAGE) ?? undefined;
      navigation.syncAccessTrail(
        p?.url?.searchParams.get(AccessMode.PAGE) ?? undefined
      );
    });
    const appEventSub = appEvents.subscribe((x) => {
      if (x.event === GlobalEvent.ESCAPE) {
        navigation.closeResource({
          isRestrictToModals: true,
          isHistoryBack: true
        });
      }
    });
    return () => {
      if (uiStateSub) uiStateSub();
      if (pageSub) pageSub();
      if (appEventSub) appEventSub();
    };
  });

  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }
</script>

<div class="flex flex-col w-full h-full">
  <div
    class={cn("flex w-full flex-grow", {
      "bg-bgs2": $context.experiments?.isEnableRoundedMain
    })}
  >
    {#if $context.embed === Embed.HANDSET}
      {@render leftNav(false)}
    {/if}
    <div class="flex flex-col h-full w-full">
      {#if !$view.isPortrait && !isOverlayFullScreen}
        {@render topNav()}
      {/if}
      <div class="flex w-full flex-grow">
        {#if $context.embed !== Embed.HANDSET && !isHideLeftNavBar && !isMaxMode}
          {@render leftNav(!!pop || !!mainPath)}
        {/if}
        <div class="min-w-0 flex-grow relative">
          {#if mainPath && !isOverlayFullScreen}
            <div
              class="absolute inset-0 w-full h-full bg-bgs1 z-40"
              data-testid="overlay-layer"
              data-overlay={mainPath}
            >
              <ContextZonePaneScope
                id="overlay"
                layer={ContextZoneLayer.OVERLAY}
              >
                <ComponentResolver
                  path={mainPath}
                  params={{ isInline: true }}
                />
              </ContextZonePaneScope>
            </div>
          {/if}
          {#if popId}
            <div
              class="absolute inset-0 flex w-full h-full bg-bgs1 z-50"
              data-testid="resource-record-surface"
              data-full-screen={isPageFullScreen ? "true" : undefined}
            >
              <div
                bind:this={pageLayerRef}
                onscrollcapture={onPageScroll}
                {...pageLayerAttributes}
                class={cn("flex justify-center h-full min-w-0", {
                  "w-1/2 min-w-1/2 shrink-0": !!besidePage && !$view.isPortrait,
                  "w-full": !besidePage || $view.isPortrait
                })}
              >
                <ContextZonePaneScope id="page" layer={ContextZoneLayer.PAGE}>
                  <ResourceResolver id={popId} accessMode={AccessMode.PAGE} />
                </ContextZonePaneScope>
              </div>
              {#if besidePage && !$view.isPortrait}
                <RightSplit
                  split={besidePage}
                  accessMode={AccessMode.BESIDE_PAGE}
                />
              {/if}
            </div>
          {/if}
          <div
            class="w-full h-full"
            inert={isBaseCovered}
            aria-hidden={isBaseCovered ? "true" : undefined}
            data-testid="base-page-layer"
          >
            <AppSplitView>
              <ContextZonePaneScope
                id="base"
                layer={ContextZoneLayer.BASE}
                isActivateOnMount={false}
              >
                {@render main?.()}
                {#if !main}
                  {@render children?.()}
                {/if}
              </ContextZonePaneScope>
            </AppSplitView>
          </div>
        </div>
        {#if rightPanel && !isOverlayFullScreen}
          {#if $view.isPortrait}
            <RightPanel action={rightPanel} isSheet={true} />
          {:else if !$view.isConstrainedWidth}
            <RightPanel action={rightPanel} />
          {/if}
        {/if}
      </div>
      {#if $view.isPortrait && $context.embed !== Embed.HANDSET}
        <PortraitBackControl
          isAppMenuShown={!isBaseCovered && !$appStore.isMenuHidden}
        />
      {/if}
    </div>
  </div>
</div>
