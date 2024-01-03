<script lang="ts">
  import type { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { onMount } from "svelte";
  import PanelSwitcher from "./PanelSwitcher.svelte";
  export let items: string[];
  export let selectedIndex: number;
  export let style: PanelSwitcherStyle;
  export let interval: number = 4000;
  onMount(() => {
    const intervalTimer = setInterval(() => {
      selectedIndex = (selectedIndex + 1) % items.length;
    }, interval);
    return () => {
      clearInterval(intervalTimer);
    };
  });
</script>

<PanelSwitcher {items} {selectedIndex} {style} on:switch />
