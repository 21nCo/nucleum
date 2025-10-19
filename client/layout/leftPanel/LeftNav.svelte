<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import LeftNavExpandable from "@21n/layout/leftPanel/LeftNavExpandable.svelte";
  import LeftNavFixed from "@21n/layout/leftPanel/LeftNavFixed.svelte";
  import PortraitBottomNav from "@21n/layout/leftPanel/PortraitBottomNav.svelte";

  export let variant: "fixed" | "expandable" = "expandable";
  import ProfileLeftPanelSection from "@21n/components/settings/account/ProfileLeftPanelSection.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  import { Action } from "@21n/types/action.enum";
  import { Size } from "@21n/types/size.enum";
  import { resolveProductConfig } from "@21n/products/product.config";

  let isInFocusMode = false;
  let isRounded = false;
  const productConfig = resolveProductConfig();
  // $: isRounded = $appearance.skin === AppSkin.Glassy ? true : false;
  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
</script>

{#if !$appStore.isMenuHidden && !isInFocusMode}
  {#if $view.isPortrait && productConfig.appMenuPt.length > 0}
    <PortraitBottomNav />
  {:else if !$view.isPortrait && productConfig.appMenu.length > 0}
    {#if variant === "expandable"}
      <LeftNavExpandable {isRounded}>
        <slot name="header" slot="header">
          <div class="flex flex-col w-full justify-center items-center gap-4">
            <ProfileLeftPanelSection />
            <div class="px-3 w-full mt-4">
              <button
                class="h-10 w-full flex justify-between items-center px-2 border border-brs3 rounded-md hover:bg-bgs3 text-b2 text-fgs2 font-light"
                on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
              >
                <span class="flex gap-2 items-center">
                  <Icon icon="search" size={Size.sm} />
                  <span> Search </span>
                </span>
                <ShortcutText
                  shortcut={Action.GLOBAL_SEARCH}
                  parentBgIndex={2}
                  isAlwaysShown={true}
                />
              </button>
            </div>
          </div>
        </slot>
        <slot name="header-thin" slot="header-thin">
          <div class="w-full flex justify-center">
            <Button
              icon="search"
              parentBgIndex={2}
              on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
            />
          </div>
        </slot>
      </LeftNavExpandable>
    {:else if variant === "fixed"}
      <LeftNavFixed {isRounded}>
        <div slot="panel" class="h-full overflow-auto relative">
          {#if $appStore.currentComponent?.panel}
            <svelte:component this={$appStore.currentComponent.panel} />
          {/if}
        </div>
      </LeftNavFixed>
    {/if}
  {/if}
{/if}
<svelte:window on:focusMode={handleFocusMode} />
