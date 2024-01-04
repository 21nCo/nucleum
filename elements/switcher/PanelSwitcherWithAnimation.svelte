<script lang="ts">
  import type { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { onMount } from "svelte";
  import PanelSwitcher from "./PanelSwitcher.svelte";
  export let items: string[];
  export let selectedIndex: number;
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
      selectedIndex = (selectedIndex + 1) % items.length;
    }, interval);
  }
</script>

<PanelSwitcher
  {items}
  bind:selectedIndex
  {style}
  on:switch={() => {
    clearInterval(intervalTimer);
    intervalTimer = startIntervalTimer();
  }}
/>
