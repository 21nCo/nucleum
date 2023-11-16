<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import FormControlLabel from "../text/FormControlLabel.svelte";

  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let isRequired: boolean = false;
  export let orientation: Orientation = Orientation.Vertical;
</script>

<div
  class="relative flex w-full gap-2 {orientation === Orientation.Vertical
    ? 'flex-col'
    : 'flex-row justify-between'}"
>
  {#if label}
    <FormControlLabel {label} {info} {isRequired} />
  {/if}
  <slot />
</div>
