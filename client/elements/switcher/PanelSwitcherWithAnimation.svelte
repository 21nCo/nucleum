<script lang="ts">
  import type { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { onMount } from "svelte";
  import PanelSwitcher from "./PanelSwitcher.svelte";
  export let items: string[];
  export let value: string;
  export let style: PanelSwitcherStyle;
  export let interval: number = 4000;
  let intervalTimer: any;
  onMount(() => {
    intervalTimer = startIntervalTimer();
    return () => {
      clearInterval(intervalTimer);
    };
  });
  function startIntervalTimer() {
    return setInterval(() => {
      let selectedIndex = items.indexOf(value);
      selectedIndex = (selectedIndex + 1) % items.length;
      value = items[selectedIndex];
    }, interval);
  }
</script>

<PanelSwitcher
  {items}
  bind:value
  {style}
  on:switch={() => {
    clearInterval(intervalTimer);
    intervalTimer = startIntervalTimer();
  }}
/>
