<svelte:options runes={true} />

<script lang="ts">
  import {
    resolveLayoutRoute,
    isHomeRoute
  } from "@nucleum/shell/navigation/layout-route";
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
  import BottomNav from "@nucleum/shell/bottomNav/BottomNav.svelte";
  import { hTrail } from "@nucleum/shell/topNav/tabs/tabs.store";
  import Trail from "@nucleum/shell/trail/Trail.svelte";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import ResourceResolver from "@nucleum/shell/paint/ResourceResolver.svelte";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { cn } from "@21n/ui/environment/presentation";
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

  let isMaxMode = $state(
    new URLSearchParams(window.location.search).get(AppSearchParam.MAX) ===
      "true"
  );
  let isHomePage = $state(isHomeRoute(new URL(window.location.href)));
  let rightPanel = $state<IAction | undefined>(undefined);
  let pop = $state<{ id: IRecordId; action: IAction } | undefined>(undefined);
  let mainPath = $state<string | undefined>(undefined);
  let popId = $derived.by(() => {
    if (!pop || typeof pop !== "object") return undefined;
    return typeof pop.id === "string" && pop.id.length > 0 ? pop.id : undefined;
  });

  onMount(() => {
    const uiStateSub = uiState.subscribe(() => {
      isHideLeftNavBar = refreshSidebarState();
    });
    const pageSub = page.subscribe((p) => {
      const route = resolveLayoutRoute(p?.url);
      isMaxMode = route.isMaxMode;
      isHomePage = route.isHomePage;
      rightPanel = route.rightPanel;
      pop = route.pop;
      mainPath = route.mainPath;
    });
    const appEventSub = appEvents.subscribe((x) => {
      if (x.event === GlobalEvent.ESCAPE) {
        navigation.closeResource({ isRestrictToModals: true });
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
      {#if !$view.isPortrait && !isMaxMode}
        {@render topNav()}
      {/if}
      <div class="flex w-full flex-grow">
        {#if $context.embed !== Embed.HANDSET && !isHideLeftNavBar && !isMaxMode}
          {@render leftNav(!!pop || !!mainPath)}
        {/if}
        <div class="min-w-0 flex-grow relative">
          {#if mainPath}
            <div class="absolute inset-0 w-full h-full bg-bgs1 z-40">
              <ComponentResolver path={mainPath} params={{ isInline: true }} />
            </div>
          {/if}
          {#if popId}
            <div
              class="absolute inset-0 flex justify-center w-full h-full bg-bgs1 z-50"
              data-testid="resource-record-surface"
            >
              <ResourceResolver id={popId} accessMode={AccessMode.POP} />
            </div>
          {/if}
          {#if $hTrail.path.length > 0 && $hTrail.activated && (!$hTrail.isBaseNonRecord || ($hTrail.isBaseNonRecord && $hTrail.activated !== $hTrail.path[0]))}
            <Trail />
          {:else}
            <AppSplitView>
              {@render main?.()}
              {#if !main}
                {@render children?.()}
              {/if}
            </AppSplitView>
          {/if}
        </div>
        {#if !$view.isConstrainedWidth && rightPanel}
          <RightPanel action={rightPanel} />
        {/if}
      </div>
      {#if $hTrail.path.length > 0 && !isHomePage}
        <BottomNav />
      {/if}
    </div>
  </div>
</div>
