<script lang="ts">
  import Switcher from "$lib/tidy/elements/switcher/Switcher.svelte";
  import { appEvents, appStore } from "$lib/tidy/stores/app.store";
  import type { AppStore } from "$lib/tidy/types/appStore.type";
  import { EventType } from "$lib/tidy/types/event.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import {
    SelectionItemActiveStyle,
    SwitcherStyle,
  } from "$lib/tidy/types/switcher.enum";
  import { onMount } from "svelte";
  let selected: number = 0;
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x && x.pageMenu && x.pageMenu.length > 0) {
        selected = 0;
      }
    });
  });
</script>

{#if $appStore.pageMenu && $appStore.pageMenu.length > 0}
  <div class="pl-4">
    <Switcher
      items={$appStore.pageMenu.map((t) => t.label)}
      style={SwitcherStyle.Vertical}
      size={Size.sm}
      selectionStyle={SelectionItemActiveStyle.SIDEDOT}
      bind:selected
      on:switch={() => {
        appEvents.notify(EventType.PAGE_MENU_CHANGED, selected);
      }}
    />
  </div>
{/if}
