<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import PanelSwitcher from "$lib/tidy/elements/switcher/PanelSwitcher.svelte";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { runAction } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  export let items: string[];
  let selected: string = items[0];
  let isCollapsed: boolean = false;
  function handleSwitch(e: any) {
    console.log(e);
    runAction(selected);
  }
  onMount(() => {
    const pageSub = page.subscribe((x) => {
      const item = items.find((y) => y === x.params?.route);
      if (item) selected = item;
    });
    return () => {
      pageSub();
    };
  });
</script>

<div class="fixed z-50 right-0 flex justify-end bg-bgs1 pt-4 px-4 h-16">
  <div class="flex gap-4 rounded-full bg-bgs2 {isCollapsed ? 'px-4' : 'pr-4'}">
    {#if !isCollapsed}
      <PanelSwitcher
        {items}
        bind:selected
        style={PanelSwitcherStyle.TRAIN}
        on:switch={handleSwitch}
      />
    {/if}
    <Icon icon="settings" on:click={() => runAction(AppEvent.SETTINGS)} />
    <Icon icon="help" on:click={() => runAction(AppEvent.HELP)} />
    <Icon
      icon={isCollapsed ? "chevdoubleleft" : "chevdoubleright"}
      on:click={() => {
        isCollapsed = !isCollapsed;
      }}
    />
  </div>
</div>
