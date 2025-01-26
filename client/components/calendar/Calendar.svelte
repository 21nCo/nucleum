<script lang="ts">
  import { onMount } from "svelte";
  import Birdview from "./birdView/Birdview.svelte";
  import ClassicCalendar from "./classic/ClassicCalendar.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";

  const panelOptions: ISelectItem[] = [
    { value: "bird", label: "Bird View" },
    { value: "classic", label: "Classic" },
    { value: "journal", label: "Journal" }
  ];

  let selectedPanel: string = "bird";
</script>

<div class="flex flex-col h-full w-full">
  <div class="p-4 border-b border-brs3">
    <PanelSwitcher
      items={panelOptions}
      bind:value={selectedPanel}
      style={PanelSwitcherStyle.TRAIN}
      size={Size.sm}
    />
  </div>

  <div class="flex-1 min-h-0">
    {#if selectedPanel === "bird"}
      <Birdview />
    {:else if selectedPanel === "classic"}
      <ClassicCalendar />
    {:else if selectedPanel === "journal"}
      <!-- JournalCalendar will be implemented later -->
      <div class="flex items-center justify-center h-full text-fgs3">
        Journal view coming soon...
      </div>
    {/if}
  </div>
</div>
