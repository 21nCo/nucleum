<script lang="ts">
  import AppMenuSwitcher from "$lib/tidy/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import {
    appStore,
    userPreferences,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import PageMenuView from "./PageMenuView.svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import LeftBottomBar from "./LeftBottomBar.svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";

  import { bgClass, borderColor } from "$lib/tidy/utils/theme.utils";
  import { AppTheme, ColorStrength } from "$lib/tidy/types/theme.type";
  import { onMount } from "svelte";
  import { resolveUiState, runAction, setUiState } from "$lib/tidy/utils/utils";
  import { UiState } from "$lib/tidy/types/uiState.enum";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  let isMinimized: boolean = false;
  let isInThinMode: boolean = false;
  let headerHeight: number = 150;
  let isHovered: boolean = false;
  $: isInThinMode = resolveUiState(
    $userPreferences.uiStates,
    UiState.isInThinMode
  );
  $: isRounded = $userPreferences.theme === AppTheme.Glassy ? true : false;
  onMount(() => {
    if ($windowObject.landscapiness < 1.25) {
      isInThinMode = true;
    }
  });
  function onMinimizeToggled() {
    isMinimized = !isMinimized;
    if (isMinimized) isHovered = false;
  }
</script>

{#if !$windowObject.isMenuHidden}
  {#if $windowObject.isInPortraitMode}
    <div
      class="absolute bottom-0 flex flex-col justify-center items-center z-30 w-full"
    >
      {#if $appStore.player}
        <ComponentResolver path={$appStore.player} />
      {/if}
      <div
        class=" border-t border-bgs2 w-full min-w-min pb-8 pt-3 {$userPreferences.theme ===
        AppTheme.Glassy
          ? 'glassmenubar'
          : bgClass($userPreferences.theme, 0)} {borderColor(
          $userPreferences.theme,
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
          size={Size.xs}
          label="switch to verbose"
        />
      {/if}
    </div>
  {:else}
    <div
      class="flex justify-center items-center h-full {isInThinMode
        ? 'w-16 min-w-[4rem]'
        : 'w-56 min-w-[14rem]'} {isRounded ? 'ml-2' : ''}"
      on:mouseenter={() => (isHovered = true)}
      on:mouseleave={() => (isHovered = false)}
    >
      <div
        class="flex flex-col pt-4 gap-4 items-center justify-between overflow-auto w-full {isRounded
          ? 'rounded-lg ' + bgClass($userPreferences.theme, 1)
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
                icon="command"
                color="fgs2"
                on:click={() => runAction(AppEvent.CMD)}
                hoverStyle={SelectionItemActiveStyle.ACCENT_COLOR}
              />
            {:else}
              <div class="text-b3 text-fgs3 mb-4">
                Press <button
                  class="text-fgs2 px-2 py-0.5 rounded-md {bgClass(
                    $userPreferences.theme,
                    2
                  )}"
                  on:click={() => runAction(AppEvent.CMD)}>Cmd + K</button
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
