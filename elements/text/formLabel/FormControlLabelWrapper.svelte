<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import FormControlLabel from "./FormControlLabel.svelte";

  export let label: string | undefined = undefined;
  export let info: FormLabelInfoTooltip | undefined = undefined;
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
