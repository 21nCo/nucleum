<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import view from "@21n/ui/environment/view.store";
  import LeftNavExpandable from "@nucleum/shell/leftPanel/LeftNavExpandable.svelte";
  import LeftNavFixed from "@nucleum/shell/leftPanel/LeftNavFixed.svelte";
  import PortraitBottomNav from "@nucleum/shell/leftPanel/PortraitBottomNav.svelte";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import ShortcutText from "@21n/ui/elements/text/ShortcutText.svelte";
  import { Action } from "@nucleum/client/config/action.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import type { Snippet } from "svelte";
  let {
    variant = "expandable",
    isHidePanel = false,
    profileSection = undefined,
    offlineStatus = undefined,
    expandableOfflineStatus = undefined,
    capture = undefined
  }: {
    variant?: "fixed" | "expandable";
    isHidePanel?: boolean;
    /** Profile/account entry slot rendered at the top of the left nav. */
    profileSection?: Snippet;
    /** Sync/offline status slot forwarded to the fixed left nav bottom bar. */
    offlineStatus?: Snippet<[{ isIconOnly?: boolean }]>;
    expandableOfflineStatus?: Snippet<[isInThinMode: boolean]>;
    /** Quick capture slot forwarded to the portrait bottom nav menu. */
    capture?: Snippet;
  } = $props();
  let isRounded = false;
  const productConfig = requireProductConfig();
</script>

{#if !$appStore.isMenuHidden}
  {#if $view.isPortrait && productConfig.appMenuPt.length > 0}
    <PortraitBottomNav {capture} />
  {:else if !$view.isPortrait && productConfig.appMenu.length > 0}
    {#if variant === "expandable"}
      <LeftNavExpandable {isRounded} offlineStatus={expandableOfflineStatus}>
        {#snippet header()}
          <div class="flex flex-col w-full justify-center items-center gap-4">
            {@render profileSection?.()}
            <div class="px-3 w-full mt-4">
              <button
                class="h-10 w-full flex justify-between items-center px-2 border border-brs3 rounded-md hover:bg-bgs3 text-b2 text-fgs2 font-light"
                onclick={() => requireCommandHost().runAction(Action.SEARCH)}
              >
                <span class="flex gap-2 items-center">
                  <Icon icon="search" size={Size.sm} />
                  <span> Search </span>
                </span>
                <ShortcutText
                  shortcut={Action.SEARCH}
                  parentBgIndex={2}
                  isAlwaysShown={true}
                />
              </button>
            </div>
          </div>
        {/snippet}
        {#snippet headerThin()}
          <div class="w-full flex justify-center">
            <Button
              icon="search"
              parentBgIndex={2}
              onclick={() => requireCommandHost().runAction(Action.SEARCH)}
            />
          </div>
        {/snippet}
      </LeftNavExpandable>
    {:else if variant === "fixed"}
      <LeftNavFixed {isRounded} {offlineStatus}>
        {#snippet panel()}
          <div class="h-full overflow-auto relative">
            {#if !isHidePanel && $appStore.currentComponent?.panel}
              {@const PanelComponent = $appStore.currentComponent.panel}
              <PanelComponent />
            {/if}
          </div>
        {/snippet}
      </LeftNavFixed>
    {/if}
  {/if}
{/if}
