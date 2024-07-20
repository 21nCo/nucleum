<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import Switch from "./Switch.svelte";
  import InputBaseElement from "../InputBaseElement.svelte";
  export let label: InputLabel;
  export let style: InputStyle = InputStyle.PLAIN;
  export let checked: boolean = false;
  export let size: Size = Size.md;
  export let isExpanded: boolean = false;
  if (!label.orientation) {
    label = {
      ...label,
      orientation: Orientation.Horizontal
    };
  }
  $: console.log({ isExpanded, style });
</script>

{#if !isExpanded && (label.orientation === Orientation.Horizontal || !label.orientation)}
  <button
    class={cn("flex justify-center items-center min-w-32", {
      "gap-3": size === Size.sm,
      "gap-4": size === Size.md,
      "border border-brs3 rounded-full py-1": style === InputStyle.BORDERED
    })}
    on:click={() => {
      console.log("clicked");
      checked = !checked;
    }}
  >
    <Switch bind:on={checked} {size} />
    <FormControlLabel props={label} />
  </button>
{:else}
  <InputBaseElement {style} {label}>
    <Switch bind:on={checked} {size} on:change />
  </InputBaseElement>
{/if}
