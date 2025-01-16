<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import LeftNavExpandable from "./LeftNavExpandable.svelte";
  import LeftNavFixed from "./LeftNavFixed.svelte";
  import PortraitBottomNav from "./PortraitBottomNav.svelte";
  export let variant: "fixed" | "expandable" = "expandable";
  import ProfileLeftPanelSection from "$lib/client/components/settings/account/ProfileLeftPanelSection.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";

  let isInFocusMode = false;
  let isRounded = false;
  // $: isRounded = $appearance.skin === AppSkin.Glassy ? true : false;
  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
</script>

{#if !$appStore.isMenuHidden && !isInFocusMode}
  {#if $view.isPortrait}
    <PortraitBottomNav />
  {:else if variant === "expandable"}
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
                <Icon icon="ph:magnifying-glass-light" size={Size.sm} />
                <span> Search </span>
              </span>
              <ShortcutText shortcut={Action.GLOBAL_SEARCH} parentBgIndex={2} />
            </button>
          </div>
        </div>
      </slot>
      <slot name="header-thin" slot="header-thin">
        <div class="w-full flex justify-center">
          <Button
            icon="ph:magnifying-glass-light"
            parentBgIndex={2}
            on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
          />
        </div>
      </slot>
    </LeftNavExpandable>
  {:else if variant === "fixed"}
    <LeftNavFixed {isRounded} />
  {/if}
{/if}
<svelte:window on:focusMode={handleFocusMode} />
