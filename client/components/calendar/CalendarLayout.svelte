<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { CalendarLayout } from "./calendar.type";
  export let panel: CalendarLayout = CalendarLayout.Bird;

  const panelOptions: ISelectItem[] = [
    { value: CalendarLayout.Classic, label: "Classic" },
    { value: CalendarLayout.Journal, label: "Journal" }
    // {
    //   value: CalendarLayout.Bird,
    //   label: "Bird",
    //   badge: "planned",
    //   isDisabled: true
    // }
  ];
</script>

<div class="flex flex-col h-full w-full">
  <div class="p-4 border-b border-brs3 flex items-center gap-4">
    <PanelSwitcher
      items={panelOptions}
      bind:value={panel}
      style={PanelSwitcherStyle.TRAIN}
      size={Size.sm}
    />
    <slot name="header" />
  </div>
  <div class="flex-1 min-h-0">
    <slot />
  </div>
</div>
