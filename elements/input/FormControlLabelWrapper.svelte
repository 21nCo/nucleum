<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabel from "../text/FormControlLabel.svelte";

  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let orientation: Orientation = Orientation.Vertical;
</script>

<div
  class="flex w-full gap-2 {orientation === Orientation.Vertical
    ? 'flex-col'
    : 'flex-row justify-between'}"
>
  {#if label}
    <FormControlLabel {label} {info} />
  {/if}
  <slot />
</div>
