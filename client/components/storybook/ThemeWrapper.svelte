<script lang="ts">
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { DropDownStyle } from "$lib/client/types/dropdownItem.type";
  import { appConstants } from "$lib/client/stores/app.store";
  let items = appConstants.colorSchemes.map((x) => ({
    value: x.tailwindSelector,
    label: x.label + " " + (x.isDark ? "dark" : "light")
  }));
  let className: string = items[0].value;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class={className + " bg-bgs1 border border-fgs1"} on:click|stopPropagation>
  <!-- Note Clicks must be made outside of the theme wrapper for those to be detected by the document's click eventlistners -->

  <DropDown
    on:select={(e) => (className = e.detail)}
    {items}
    value={items[0].value}
    style={DropDownStyle.OUTLINED}
    isActive={true}
  />
  <div
    class="flex items-center justify-center"
    style="min-width:320px; min-height:500px;padding:20px;"
  >
    <slot />
  </div>
</div>
<!-- <div
  class={className +
    " flex flex-col justify-around items-center bg-bgs1 border border-fgs1"}
  style="min-width:320px; min-height:500px;padding:20px;"
  on:click|stopPropagation
>
  Note Clicks must be made outside of the theme wrapper for those to be detected by the document's click eventlistners
  <div style="width:70%;">
    <DropDown
      on:select={(e) => (className = e.detail)}
      {items}
      value={items[0].value}
      style={DropDownStyle.OUTLINED}
      isActive={true}
    />
  </div>
  <slot />
</div> -->
