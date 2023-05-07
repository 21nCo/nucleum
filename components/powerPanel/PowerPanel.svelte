<script lang="ts">
  import PageSwitcher from "$lib/tidy/elements/pageSwitcher/PageSwitcher.svelte";
  import {
    appStore,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { PageSwitcherStyle } from "$lib/tidy/types/pagemenuitem.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "$lib/tidy/elements/Button.svelte";
  import PageMenuView from "./PageMenuView.svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  let isMinimized: boolean = false;
  let headerHeight: number = 150;
  let isHovered: boolean = false;
  function onMinimizeToggled() {
    isMinimized = !isMinimized;
    if (isMinimized) isHovered = false;
  }
</script>

{#if $windowObject.isInPortrait}
  <div
    class="absolute bottom-0 flex flex-col justify-center items-center z-10 w-full"
  >
    <!-- todo - support for multiple players like music and timer at the same time -->
    {#if $appStore.players && $appStore.players.length > 0 && $appStore.players[0].isShow}
      <ComponentResolver
        path={$appStore.players[0].componentPath}
        params={$appStore.players[0].params}
      />
    {/if}
    <div class="bg-bgs2 rounded-t-md w-full min-w-min">
      <PageSwitcher style={PageSwitcherStyle.THIN} parentBackgroundIndex={1} />
    </div>
  </div>
{:else if isMinimized}
  <div
    class="flex flex-col gap-4 absolute left-1 z-10 {isHovered
      ? 'bg-bgs4 rounded-lg p-2'
      : 'opacity-40'}"
    style="top: {headerHeight}px"
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
  >
    <PageSwitcher
      {isHovered}
      parentBackgroundIndex={1}
      style={PageSwitcherStyle.MINIMIZED}
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
  <div class="flex justify-center items-center h-full w-56 ml-2">
    <div
      class="flex flex-col py-10 gap-4 items-center justify-between w-full rounded-lg {$userPreferences.theme ==
      'Colorful'
        ? 'glass'
        : 'bg-bgs2'}"
      style="height: calc(100% - 1rem);"
    >
      <div class="w-full flex flex-col gap-12">
        <slot name="header" />
        <div class="flex flex-col gap-12 w-full p-2">
          <PageSwitcher parentBackgroundIndex={1} />
          {#if $appStore.pageMenu && $appStore.pageMenu.length > 0}
            <PageMenuView />
          {/if}
          <!-- todo - dynamicsection rendering from dyanmic items -->
        </div>
      </div>
      {#if $appStore.isDebugMode}
        <Button
          on:click={onMinimizeToggled}
          size={Size.xs}
          label="switch to min mode"
        />
      {/if}
      <!-- todo - static section rendering from static items -->
    </div>
  </div>
{/if}

<style>
  .glass {
    background: rgba(204, 204, 214, 0.2);
    /* border: 1px solid white; */
    backdrop-filter: blur(25px);
  }
</style>
