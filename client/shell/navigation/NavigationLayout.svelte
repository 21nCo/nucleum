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
  import { isRightPanelSheet } from "@nucleum/shared-state/commands/live-action-access";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { page } from "$app/stores";
  import RightSplit from "@nucleum/shell/RightSplit.svelte";
  import PortraitBackControl from "@nucleum/shell/navigation/PortraitBackControl.svelte";
  import { pageScroll } from "@nucleum/shell/navigation/page-scroll";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { cn } from "@21n/ui/environment/presentation";
  import { pageLayerAttributes } from "@nucleum/shell/navigation/page-layer";
  import { isOverlayAbovePage } from "@nucleum/shell/navigator/navigator-layer";
  import { isRightPanelCovered } from "@nucleum/shell/navigation/top-layer";
  import { setRightPanelSheetShown } from "@nucleum/shell/rightPanel/right-panel-visibility";
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
  let rightPanel = $state<IAction | undefined>(undefined);
  let pop = $state<{ id: IRecordId; action: IAction } | undefined>(undefined);
  let mainPath = $state<string | undefined>(undefined);
  let popId = $derived.by(() => {
    if (!pop || typeof pop !== "object") return undefined;
    return typeof pop.id === "string" && pop.id.length > 0 ? pop.id : undefined;
  });
  const isBaseCovered = $derived(!!popId || !!mainPath);
  const isPageCovered = $derived(!!popId && isOverlayAbovePage(mainPath));
  const isPageFullScreen = $derived(isMaxParam && !!popId && !$view.isPortrait);
  const isOverlayFullScreen = $derived(isMaxParam && !!mainPath && !popId);
  const isMaxMode = $derived(isPageFullScreen || isOverlayFullScreen);
  const isPanelSheet = $derived(isRightPanelSheet($view));
  const isPanelSuspended = $derived(
    isRightPanelCovered({
      overlay: mainPath,
      page: popId,
      isMax: isMaxParam,
      isSheet: isPanelSheet
    })
  );
  const isPanelShown = $derived(!!rightPanel && !isPanelSuspended);
  const isPanelSheetShown = $derived(isPanelShown && isPanelSheet);
  const isLeftNavShown = $derived(
    $context.embed !== Embed.HANDSET && !isHideLeftNavBar && !isMaxMode
  );

  $effect(() => {
    contextZone.setVisibleLayers(
      popId && !isPageCovered
        ? [ContextZoneLayer.PAGE, ContextZoneLayer.BESIDE_PAGE]
        : mainPath
          ? [ContextZoneLayer.OVERLAY]
          : [ContextZoneLayer.BASE, ContextZoneLayer.BESIDE_BASE]
    );
  });

  $effect(() => () => contextZone.setVisibleLayers(undefined));

  $effect(() => setRightPanelSheetShown(isPanelSheetShown));

  $effect(() => () => setRightPanelSheetShown(false));

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

{#snippet overlayLayer(path: string)}
  <div
    class={cn("absolute inset-0 w-full h-full bg-bgs1", {
      "z-40": !isPageCovered,
      "z-50": isPageCovered
    })}
    data-testid="overlay-layer"
    data-overlay={path}
  >
    <ContextZonePaneScope id="overlay" layer={ContextZoneLayer.OVERLAY}>
      <ComponentResolver {path} params={{ isInline: true }} />
    </ContextZonePaneScope>
  </div>
{/snippet}

<div class="shell-frame flex flex-col w-full h-full">
  <div class="flex w-full flex-grow app-framed:bg-bgs2">
    {#if $context.embed === Embed.HANDSET}
      <div class="contents" inert={isPanelSheetShown}>
        {@render leftNav(false)}
      </div>
    {/if}
    <div class="flex flex-col h-full w-full">
      {#if !$view.isPortrait && !isOverlayFullScreen}
        {@render topNav()}
      {/if}
      <div class="flex w-full flex-grow">
        {#if isLeftNavShown}
          <div class="contents" inert={isPanelSheetShown}>
            {@render leftNav(!!pop || !!mainPath)}
          </div>
        {/if}
        <div
          class={cn(
            "shell-main min-w-0 flex-grow relative",
            "app-framed:overflow-hidden app-framed:bg-bgs1 app-framed:rounded-[var(--app-panel-radius)] app-framed:mr-[var(--app-shell-gap)] app-framed:mb-[var(--app-shell-gap)]",
            { "app-framed:ml-[var(--app-shell-gap)]": !isLeftNavShown }
          )}
          inert={isPanelSheetShown}
          aria-hidden={isPanelSheetShown ? "true" : undefined}
        >
          {#if mainPath && !isOverlayFullScreen && !isPageCovered}
            {@render overlayLayer(mainPath)}
          {/if}
          {#if popId}
            <div
              class="absolute inset-0 flex w-full h-full bg-bgs1 z-50"
              data-testid="resource-record-surface"
              data-full-screen={isPageFullScreen ? "true" : undefined}
              inert={isPageCovered}
              aria-hidden={isPageCovered ? "true" : undefined}
            >
              <div
                use:pageScroll={popId}
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
          {#if mainPath && !isOverlayFullScreen && isPageCovered}
            {@render overlayLayer(mainPath)}
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
        {#if rightPanel}
          <RightPanel
            action={rightPanel}
            isSheet={isPanelSheet}
            isSuspended={isPanelSuspended}
          />
        {/if}
      </div>
      {#if $view.isPortrait && !isPanelSheetShown}
        <PortraitBackControl />
      {/if}
    </div>
  </div>
</div>

<style>
  .shell-frame:has(:global(.context-tab[data-leading]))
    .shell-main {
    border-top-left-radius: 0;
  }
</style>
