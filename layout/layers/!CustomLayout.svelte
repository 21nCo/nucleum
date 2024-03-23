<!-- <script lang="ts">
  import {
    appEvents,
    appStore,
    userPreferences,
    view
  } from "$lib/tidy/stores/app.store";
  import { LayoutType } from "$lib/tidy/types/layout.enum";
  import { onMount } from "svelte";
  import PageMenuView from "../leftPanel/PageMenuView.svelte";
  import Switcher from "../../elements/switcher/Switcher.svelte";
  import { SelectionItemActiveStyle } from "../../types/switcher.enum";
  import { AppEvent } from "../../types/event.enum";
  import type { AppEventType } from "../../types/event.type";
  import Button from "../../elements/button/Button.svelte";
  import { Size } from "../../types/size.enum";
  export let layoutType: LayoutType = LayoutType.ONEPANEL;
  export let panelTitles: string[] = [];
  export let isShowPageMenu: boolean = true;
  let pad: number;
  let selectedPanel: number = 0;
  $: if ($view.height) {
    let rawPad = ($view.height / 10) * $view.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(() => {
    isShowPageMenu = $view.isPortrait;
    appEvents.subscribe((x: AppEvent) => {
      if (x.type == AppEvent.PAGE_MENU_CHANGED) {
        isShowPageMenu = false;
      }
      if (
        $view.isPortrait &&
        x.type === AppEvent.THINMODE_PANELSWITCH &&
        x.value != undefined
      ) {
        selectedPanel = x.value;
      }
    });
  });
</script>

{#if $appStore.pageMenu && $appStore.pageMenu.length > 0 && isShowPageMenu}
  <div class="flex flex-col h-full justify-center">
    <PageMenuView />
  </div>
{:else}
  {#if $appStore.pageMenu && $appStore.pageMenu.length > 0 && $view.isPortrait}
    <div style="padding: {pad / 4}px;">
      <Button
        label="go back"
        size={Size.sm}
        on:click={() => {
          isShowPageMenu = true;
        }}
      />
    </div>
  {/if}
  {#if layoutType == LayoutType.ONEPANEL}
    <div class="w-full h-full" style="padding: {pad / 4}px;">
      <slot />
    </div>
  {:else if layoutType == LayoutType.TWOPANEL}
    {#if $view.isPortrait}
      <div
        class="flex w-full text-h2"
        style="margin-top: {pad / 4}px; margin-bottom: {pad / 4}px;"
      >
        <div>
          <Switcher
            items={panelTitles}
            bind:selectedIndex={selectedPanel}
            selectionStyle={SelectionItemActiveStyle.BOTTOMDOT}
          />
        </div>
      </div>
    {/if}
    <div class="flex justify-center w-full items-center overflow-auto">
      <div class="flex h-full w-full">
        {#if !$view.isPortrait}
          <div
            class="relative w-2/5 max-w-xl flex flex-col items-center gap-4 rounded-xl m-2 {$userPreferences.theme ==
            'Colorful'
              ? 'glasspanel'
              : 'bg-bgs2'}"
            style="padding-top: {pad / 4}px; padding-bottom: {pad /
              4}px; padding-right: {pad / 8}px; padding-left: {pad /
              8}px; height: calc(100% - 1rem);"
          >
            <slot name="sidepanel" />
          </div>
          <div
            class="flex justify-center items-center p-4 w-3/5"
            style="padding-top: {pad}px; padding-bottom: {pad}px;"
          >
            <slot name="main" />
          </div>
        {:else}
          <div class="flex w-full h-full {selectedPanel === 0 ? '' : 'hidden'}">
            <slot name="sidepanel" />
          </div>
          <div
            class="flex justify-center items-center w-full {selectedPanel === 1
              ? ''
              : 'hidden'}"
          >
            <slot name="main" />
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .glasspanel {
    background: rgba(6, 8, 49, 0.2);
    /* border: 1px solid white; */
    backdrop-filter: blur(25px);
  }
</style> -->
