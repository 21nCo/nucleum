<script lang="ts">
  import AppMenuSwitcher from "$lib/tidy/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import {
    appStore,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "$lib/tidy/elements/Button.svelte";
  import PageMenuView from "./PageMenuView.svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import LeftBottomBar from "./LeftBottomBar.svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";

  import { bg, borderColor } from "$lib/tidy/utils/theme.utils";
  import { AppTheme, ColorStrength } from "$lib/tidy/types/theme.type";
  import { onMount } from "svelte";
  let isMinimized: boolean = false;
  let isInThinMode: boolean = false;
  let headerHeight: number = 150;
  let isHovered: boolean = false;
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
        class=" border-t border-bgs2 w-full min-w-min pb-6 pt-1 {$userPreferences.theme ===
        AppTheme.Glassy
          ? 'glassmenubar'
          : bg($userPreferences.theme, 0)} {borderColor(
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
      class="flex flex-col gap-4 absolute left-1 z-30 {isHovered
        ? 'bg-bgs4 rounded-lg p-2'
        : 'opacity-40'}"
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
        ? 'w-16'
        : 'w-56'} flex-none {isRounded ? 'ml-2' : ''}"
      on:mouseenter={() => (isHovered = true)}
      on:mouseleave={() => (isHovered = false)}
    >
      <div
        class="flex flex-col pt-4 gap-4 items-center justify-between overflow-auto w-full {isRounded
          ? 'rounded-lg ' + bg($userPreferences.theme, 1)
          : 'border-r border-bgs2 bg-bgs2'}"
        style={isRounded ? "height: calc(100% - 1rem);" : "height:100%"}
      >
        <div class="w-full flex flex-col gap-8 lg:gap-12">
          <div
            class="w-full flex h-6 {isInThinMode
              ? 'justify-center'
              : 'justify-end'}  px-2"
          >
            {#if isHovered}
              <Button
                icon="sidebar-toggle"
                on:click={() => {
                  isInThinMode = !isInThinMode;
                }}
              />
            {/if}
          </div>
          {#if !isInThinMode}
            <slot name="header" />
          {/if}
          <div class="flex flex-col gap-12 items-center w-full p-2">
            <AppMenuSwitcher
              parentBackgroundIndex={1}
              layoutContext={isInThinMode
                ? LayoutContext.THIN
                : LayoutContext.DEFAULT}
            />
            {#if $appStore.pageMenu && $appStore.pageMenu.length > 0}
              <PageMenuView />
            {/if}
            <!-- todo - dynamicsection rendering from dyanmic items -->
          </div>
        </div>
        <div class="w-full flex flex-col gap-2 items-center">
          {#if $appStore.isDebugMode}
            <Button
              on:click={onMinimizeToggled}
              size={Size.xs}
              label="switch to min mode"
            />
          {/if}
          {#if isInThinMode}
            <!-- todo - on click - show command bar -->
            <Icon
              icon="command"
              color="fgs2"
              hoverStyle={SelectionItemActiveStyle.ACCENT_COLOR}
            />
          {:else}
            <div class="text-b3 text-fgs3 mb-4">
              Press <span
                class="text-fgs2 px-2 py-0.5 rounded-md {bg(
                  $userPreferences.theme,
                  2
                )}">Cmd + K</span
              > for command bar
            </div>
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
