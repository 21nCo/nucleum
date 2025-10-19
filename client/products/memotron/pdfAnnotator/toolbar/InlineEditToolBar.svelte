<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import HighlightColors from "@21n/products/memotron/common/highlighters/HighlightColors.svelte";
  let dispatch = createEventDispatcher();
  export let style = "";
  export let selectedColor = "";
  export let editable = false;
</script>

<button
  class="flex gap-1 min-h-fit h-10 items-center bg-bgs2 text-fgs1 rounded-md px-2 py-1 border border-brs3"
  {style}
  on:click|stopPropagation
  on:mousedown|stopPropagation
>
  <Button
    icon="trash"
    parentBgIndex={2}
    tooltip="Delete"
    on:click={() => {
      dispatch("delete");
    }}
  />
  {#if editable}
    <Button
      icon="pencil-square"
      tooltip="Edit"
      parentBgIndex={2}
      on:click={() => {
        dispatch("edit");
      }}
    />
  {/if}
  <Divider
    orientation={Orientation.Vertical}
    colorStrength={ColorStrength.Strong}
  />
  <HighlightColors bind:selected={selectedColor} on:color />
</button>
