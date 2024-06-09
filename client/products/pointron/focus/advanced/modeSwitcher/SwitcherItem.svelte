<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  export let mode: number = 0;
  export let isActive: boolean = false;
  let color = retrieveCurrentColors($appearance).fgs3 ?? "";
</script>

<button
  class="flex items-center justify-center gap-2 {isActive
    ? ' rounded-b-md text-aps1'
    : ' rounded-b-md text-fgs3'}"
  style={mode == 0
    ? "border-bottom-right-radius: 0rem;"
    : "border-bottom-left-radius: 0rem;"}
  on:click
>
  {#if mode === 0}
    <Icon
      icon="folder"
      {isActive}
      selectionStyle={SelectionItemActiveStyle.ACCENT_COLOR}
      {color}
    />
    Presets
  {:else}
    <Icon
      icon="clock"
      {isActive}
      {color}
      selectionStyle={SelectionItemActiveStyle.ACCENT_COLOR}
    />
    Custom
  {/if}
</button>
