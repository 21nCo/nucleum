<script lang="ts">
  import AppMenuSwitcher from "$lib/client/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import PageMenuView from "./PageMenuView.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import LeftBottomBar from "./LeftBottomBar.svelte";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";

  import { bgClass, borderClass } from "$lib/client/utils/theme.utils";
  import { AppSkin, ColorStrength } from "$lib/client/types/appearance.type";
  import { onMount } from "svelte";

  import { UiState } from "$lib/client/types/uiState.enum";
  import { AppEvent } from "$lib/client/types/event.enum";
  import appearance from "$lib/client/stores/appearance.store";
  let isMinimized: boolean = false;
  let isInThinMode: boolean = false;
  let headerHeight: number = 150;
  let isHovered: boolean = false;
  let testingInMobileBrowser: boolean = false;
  $: isInThinMode = userPreferences.resolveUiState(UiState.isInThinMode);
  $: isRounded = $appearance.skin === AppSkin.Glassy ? true : false;
  onMount(() => {
    if ($view.landscapiness < 1.25) {
      isInThinMode = true;
    }
  });
  function onMinimizeToggled() {
    isMinimized = !isMinimized;
    if (isMinimized) isHovered = false;
  }
</script>

{#if !$view.isMenuHidden}
  {#if $view.isPortrait}
    <div
      class="absolute {testingInMobileBrowser
        ? 'bottom-14'
        : 'bottom-0'} flex flex-col justify-center items-center z-30 w-full"
    >
      {#if $appStore.player}
        <ComponentResolver path={$appStore.player} />
      {/if}
      <div
        class=" border-t border-bgs2 w-full min-w-min pb-8 pt-3 {$appearance.skin ===
        AppSkin.Glassy
          ? 'glassmenubar'
          : bgClass($appearance, 0)} {borderClass(
          $appearance,
          ColorStrength.Subtle
        )}"
      >
        <AppMenuSwitcher
          layoutContext={LayoutContext.PORTRAIT}
          parentBackgroundIndex={0}
        />
      </div>
    </div>
  {:else if isMinimized}
    <div
      class="flex flex-col items-center gap-4 absolute rounded-md left-1 z-30 {isHovered
        ? 'bg-bgs3 p-4 w-48'
        : 'bg-aps1 opacity-50'}"
      style="top: {headerHeight}px"
      on:mouseenter={() => (isHovered = true)}
      on:mouseleave={() => (isHovered = false)}
    >
      <AppMenuSwitcher
        {isHovered}
        parentBackgroundIndex={1}
        layoutContext={LayoutContext.MINIMIZED}
      />
      {#if isHovered}
        <Button
          on:click={onMinimizeToggled}
          size={Size.sm}
          label="switch to verbose"
        />
      {/if}
    </div>
  {:else}
    <div
      class="flex justify-center items-center h-full border-r border-r-brs2 {isInThinMode
        ? 'w-16 min-w-[4rem]'
        : 'w-56 min-w-[14rem]'} {isRounded ? 'ml-2' : ''}"
      on:mouseenter={() => (isHovered = true)}
      on:mouseleave={() => (isHovered = false)}
    >
      <div
        class="flex flex-col pt-4 gap-4 items-center justify-between overflow-auto w-full {isRounded
          ? 'rounded-lg ' + bgClass($appearance, 1)
          : 'border-r border-bgs2 bg-bgs2'}"
        style={isRounded ? "height: calc(100% - 1rem);" : "height:100%"}
      >
        <div class="w-full flex flex-col gap-8">
          <div
            class="w-full flex items-center h-6 {isInThinMode
              ? 'justify-center'
              : $$slots.top
                ? 'justify-between'
                : 'justify-end'}  px-2"
          >
            {#if !isInThinMode}
              <slot name="top" />
            {/if}
            {#if isHovered}
              <Button
                icon="sidebar-toggle"
                on:click={() => {
                  // $userPreferences.uiStates = setUiState(
                  //   $userPreferences.uiStates,
                  //   UiState.isInThinMode,
                  //   !isInThinMode
                  // );
                  appStore.toggleSidebar();
                }}
              />
            {/if}
          </div>
          {#if !isInThinMode}
            <slot name="header" />
          {/if}
          <div class="flex flex-col gap-8 items-center w-full p-2">
            <AppMenuSwitcher
              parentBackgroundIndex={1}
              layoutContext={isInThinMode
                ? LayoutContext.THIN
                : LayoutContext.DEFAULT}
            />
            {#if $appStore.pageMenu && $appStore.pageMenu.length > 0}
              <PageMenuView />
            {/if}
            {#if !isInThinMode}
              <slot name="mid" />
            {/if}
          </div>
        </div>
        <div class="w-full flex flex-col gap-2 items-center">
          {#if $appStore.isDebugMode}
            <Button
              on:click={onMinimizeToggled}
              size={Size.xs}
              label={isInThinMode ? "min" : "switch to min mode"}
              parentBackgroundIndex={2}
            />
          {/if}
          {#if $appStore?.appData?.isCmdBarEnabled === true}
            {#if isInThinMode}
              <!-- todo - on click - show command bar -->
              <Icon
                size={Size.lg}
                icon="command"
                color="fgs2"
                on:click={() => appStore.runAction(AppEvent.CMD)}
                hoverStyle={SelectionItemActiveStyle.ACCENT_COLOR}
              />
            {:else}
              <div class="text-b3 text-fgs3 mb-4">
                Press <button
                  class="text-fgs2 px-2 py-0.5 rounded-md {bgClass(
                    $appearance,
                    2
                  )}"
                  on:click={() => appStore.runAction(AppEvent.CMD)}
                  >Cmd + K</button
                > for command bar
              </div>
            {/if}
          {/if}

          <LeftBottomBar {isInThinMode} {isRounded} />
        </div>
      </div>
    </div>
  {/if}
{/if}

<!-- <style>
  .glass {
    background: rgba(204, 204, 214, 0.2);
    /* border: 1px solid white; */
    backdrop-filter: blur(25px);
  }
</style> -->
