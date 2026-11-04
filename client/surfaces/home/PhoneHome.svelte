<!--
  @component
  Phone home hub shared by the product mobile apps: a header with status chips
  and settings, the navigator entry, the product's app menu destinations, the
  pinned spaces, and one fixed product slot at the bottom within thumb reach.
-->
<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { Action } from "@nucleum/client/config/action.enum";
  import { ActionType } from "@nucleum/client/config/action.type";
  import { resolveSpacePath } from "@nucleum/client/config/space-route";
  import { haptic } from "@nucleum/client/runtime/embed/embed.utils";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { isInEditMode } from "@nucleum/shared-state/app-context/app.store";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import {
    createPinnedSpacesStore,
    orderPinnedSpaces,
    type PinnedSpace
  } from "@nucleum/shell/navigation/pinned-spaces";
  import { isPlayerShownInPage } from "@nucleum/shell/overlays/portrait-dock";
  import PhoneHomeHeader from "@nucleum/surfaces/home/PhoneHomeHeader.svelte";
  import QuickAccessGrid from "@21n/ui/compositions/navigation/QuickAccessGrid.svelte";
  import type { IQuickAccessItem } from "@21n/ui/compositions/navigation/quick-access.type";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import view from "@21n/ui/environment/view.store";

  let {
    slot = undefined,
    indicators = undefined,
    isSlotExpanded = false,
    isPlayerInSlot = false
  }: {
    /** The product's fixed bottom slot, such as Memotron capture. */
    slot?: Snippet;
    /** Product status chips, such as a running focus session. */
    indicators?: Snippet;
    /** Hides the hub sections while the slot takes over the screen. */
    isSlotExpanded?: boolean;
    /** The slot shows the running session, so the docked mini player hides. */
    isPlayerInSlot?: boolean;
  } = $props();

  const productConfig = requireProductConfig();
  const destinations = $derived(
    productConfig.appMenuPt.flatMap((action): IQuickAccessItem[] => {
      const resolved = requireCommandHost().resolveAction(action);
      return resolved
        ? [
            {
              id: resolved.action,
              label: resolved.label ?? resolved.action,
              icon: resolved.icon ?? "chevron-right"
            }
          ]
        : [];
    })
  );
  const pinnedIds = $derived(appMenuStore.pinnedSpaces($appMenuStore));
  const pinnedKey = $derived(pinnedIds.join(","));
  const spacesStore = $derived(
    createPinnedSpacesStore(pinnedKey ? pinnedKey.split(",") : [])
  );
  const spaces = $derived(orderPinnedSpaces(pinnedIds, $spacesStore.data));
  const isCovered = $derived(
    !!$page.url.searchParams.get(AccessMode.PAGE) ||
      !!$page.url.searchParams.get(AccessMode.OVERLAY)
  );

  $effect(() => {
    isPlayerShownInPage.set(isPlayerInSlot && !isCovered && $view.isPortrait);
    return () => isPlayerShownInPage.set(false);
  });

  const returnHomeParams = {
    searchParams: { [AppSearchParam.RETURN_TO]: `/${productConfig.homePathPt}` }
  };

  function openSettings() {
    haptic();
    requireCommandHost().runAction(Action.SETTINGS, returnHomeParams);
  }

  function openNavigator() {
    haptic();
    requireCommandHost().runAction(Action.NAVIGATOR);
  }

  function openDestination(item: IQuickAccessItem) {
    haptic();
    isInEditMode.set(false);
    const commandHost = requireCommandHost();
    const isPage = commandHost.resolveAction(item.id)?.type === ActionType.PAGE;
    commandHost.runAction(item.id, isPage ? returnHomeParams : undefined);
  }

  function openSpace(space: PinnedSpace) {
    haptic();
    navigation.gotoPath(resolveSpacePath(space.id));
  }
</script>

<div class="flex flex-col w-full h-full bg-bgs2 pt-12" data-testid="phone-home">
  {#if !isSlotExpanded}
    <div
      class={cn("flex flex-col min-h-0 overflow-y-auto", {
        "shrink-0 max-h-[60%]": !!slot,
        "flex-1": !slot
      })}
    >
      <PhoneHomeHeader {indicators} onSettings={openSettings} />
      <div class="px-4 pb-1">
        <button
          type="button"
          data-testid="phone-home-navigator"
          class="flex items-center gap-2 w-full h-11 px-3 rounded-lg border border-brs2 bg-bgs1 text-fgs3 text-b2 active:bg-bgs3"
          onclick={openNavigator}
        >
          <Icon icon="search" size={Size.sm} />
          <span>Search or jump to&hellip;</span>
        </button>
      </div>
      {#if destinations.length > 0}
        <nav aria-label="Destinations" data-testid="phone-home-destinations">
          <QuickAccessGrid items={destinations} onItemClick={openDestination} />
        </nav>
      {/if}
      {#if spaces.length > 0}
        <section
          class="flex flex-col gap-1 px-4 pt-2 pb-2"
          aria-label="Pinned spaces"
          data-testid="phone-home-pinned-spaces"
        >
          <h2 class="text-b3 text-fgs3 px-1">Pinned spaces</h2>
          <div class="grid grid-cols-2 gap-2">
            {#each spaces as space (space.id)}
              {@const label = space.label || "Untitled space"}
              <button
                type="button"
                class="flex items-center gap-2 px-2 h-11 min-w-0 bg-bgs1 hover:bg-bgs3 rounded-lg transition-colors"
                data-testid="phone-home-pinned-space"
                onclick={() => openSpace(space)}
              >
                <span class="flex w-5 h-5 shrink-0 items-center justify-center">
                  {#if space.avatar}
                    <AvatarRenderer avatar={space.avatar} size={Size.sm} />
                  {:else}
                    <Icon icon="combination" size={Size.sm} class="text-fgs2" />
                  {/if}
                </span>
                <span
                  class="flex-1 min-w-0 truncate text-left text-fgs1 text-b2"
                >
                  {label}
                </span>
                <Icon icon="chevron-right" size={Size.sm} class="text-fgs2" />
              </button>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
  {#if slot}
    <div class="flex flex-col flex-1 min-h-0" data-testid="phone-home-slot">
      {@render slot()}
    </div>
  {/if}
</div>
