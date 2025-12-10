<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "@21n/stores/app.store";
  import { scheduledNotifications } from "@21n/stores/notification.store";
  import { postDataToParent } from "@21n/utils/embed.utils";
  import context from "@21n/stores/context.store";
  import view from "@21n/stores/view.store";
  import { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import CommandModePage from "@21n/components/commandBar/CommandModePage.svelte";
  import { Embed } from "@21n/types/context.type";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import LeftNav from "@21n/layout/leftPanel/LeftNav.svelte";
  import AppSplitView from "@21n/layout/AppSplitView.svelte";
  import TopNav from "@21n/layout/topNav/TopNav.svelte";
  import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
  import RightPanel from "../rightPanel/RightPanel.svelte";
  import ResourceSearchModal from "@21n/products/memotron/library/search/ResourceSearchModal.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  import BottomNav from "../bottomNav/BottomNav.svelte";
  import { hTrail } from "../topNav/tabs/tabs.store";
  import Trail from "../trail/Trail.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "@21n/types/data.type";
  import ResourceResolver from "../paint/ResourceResolver.svelte";
  let isHideLeftNavBar: boolean = refreshSidebarState();

  let isSearchMode: boolean =
    new URLSearchParams(window.location.search).get(AppSearchParam.SEARCH) ===
    "true";
  let rightPanel: IAction | undefined = undefined;
  let pop: { id: IRecordId; action: IAction } | undefined = undefined;

  onMount(() => {
    const uiStateSub = uiState.subscribe(() => {
      isHideLeftNavBar = refreshSidebarState();
    });
    $appLoadingState.isLocalLoaded = true;
    const pageSub = page.subscribe((p) => {
      isSearchMode = p.url.searchParams.get(AppSearchParam.SEARCH) === "true";
      const rightPanelParam = p.url.searchParams.get(AppSearchParam.RIGHT);
      if (rightPanelParam) {
        rightPanel = appStore.resolveAction(rightPanelParam) ?? undefined;
      } else {
        rightPanel = undefined;
      }
      const popParam =
        p.url.searchParams.get(ResourceAccessMode.POP) ?? undefined;
      if (popParam) {
        resolvePop(popParam);
      } else {
        pop = undefined;
      }
    });
    return () => {
      if (uiStateSub) uiStateSub();
      if (pageSub) pageSub();
    };
  });

  function resolvePop(resourceId: string) {
    if (!resourceId) return;
    const slug = resourceId.split(":")[0];
    const action = appStore.resolveAction(slug);
    if (!action) return;
    pop = {
      id: resourceId,
      action
    };
  }

  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }

  async function handleVisibilityChange() {
    if (document?.hidden) {
      const registration = await navigator?.serviceWorker?.ready;
      if ($scheduledNotifications.length > 0) {
        registration?.active?.postMessage({
          type: "SCHEDULE_NOTIFICATIONS",
          notifications: $scheduledNotifications
        });
        postDataToParent(
          EmbedDataMessage.NOTIFICATIONS,
          $scheduledNotifications
        );
      }
    } else {
      scheduledNotifications.reset();
      navigator?.serviceWorker?.controller?.postMessage({
        type: "CLEAR_NOTIFICATIONS"
      });
    }
  }
</script>

{#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
  {#if $appStore.interactionMode === InteractionMode.AGENT && $context.embed !== Embed.HANDSET}
    <CommandModePage>
      <slot />
    </CommandModePage>
  {:else}
    <div class="flex flex-col w-full h-full">
      <div class="flex w-full flex-grow">
        {#if $context.embed === Embed.HANDSET}
          <LeftNav variant="fixed" />
        {/if}
        <div class="flex flex-col h-full w-full">
          {#if !$view.isPortrait}
            <TopNav>
              <slot name="topnav" slot="topnav" />
            </TopNav>
          {/if}
          <div class="flex w-full flex-grow">
            {#if $context.embed !== Embed.HANDSET && !isHideLeftNavBar}
              <LeftNav variant="fixed" isHidePanel={!!pop || isSearchMode} />
            {/if}
            <div class="min-w-0 flex-grow relative">
              {#if isSearchMode}
                <div class="absolute inset-0 w-full h-full bg-bgs1 z-40">
                  <ResourceSearchModal isInline={true} />
                </div>
              {/if}
              {#if pop}
                <div class="absolute inset-0 w-full h-full bg-bgs1 z-50">
                  <ResourceResolver
                    id={pop.id}
                    accessMode={ResourceAccessMode.POP}
                  />
                </div>
              {/if}
              {#if $hTrail.path.length > 0 && $hTrail.activated && (!$hTrail.isBaseNonRecord || ($hTrail.isBaseNonRecord && $hTrail.activated !== $hTrail.path[0]))}
                <Trail />
                <!-- {:else if $vTrail.items.length > 0 && $vTrail.activated && (!isRecordId($vTrail.base) || (isRecordId($vTrail.base) && $vTrail.activated !== $vTrail.base))}
                <TrailContent /> -->
              {:else}
                <AppSplitView>
                  <slot name="main" slot="main">
                    <slot />
                  </slot>
                </AppSplitView>
              {/if}
            </div>
            {#if rightPanel}
              <RightPanel action={rightPanel} />
            {/if}
          </div>
          {#if $hTrail.path.length > 0}
            <BottomNav />
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}
<svelte:document on:visibilitychange={handleVisibilityChange} />
