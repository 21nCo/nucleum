<script lang="ts">
  import Switcher from "$lib/client/elements/switcher/Switcher.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import {
    SelectionItemActiveStyle,
    SwitcherStyle
  } from "$lib/client/types/switcher.enum";
  export let selectedSound: string = "";
  let sounds: string[] = [
    "None",
    "Tick",
    "Lofi",
    "Meditative",
    "Relaxed",
    "Rain"
  ];
  //"meditative","joyful", "uplifting"
</script>

<!-- <div class="flex flex-wrap gap-2">
  {#each sounds as sound}
    <SystemSoundThumbnail {sound} isActive={selectedSound === sound} />
  {/each}
</div> -->

<Switcher
  items={sounds}
  selectedIndex={sounds.indexOf(selectedSound) === -1
    ? 0
    : sounds.indexOf(selectedSound)}
  style={SwitcherStyle.Horizontal}
  selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
  parentBackgroundIndex={1}
  labelOrientation={Orientation.Vertical}
  on:switch={($event) => {
    console.log($event.detail);
    selectedSound = sounds[$event.detail.selected];
  }}
/>
