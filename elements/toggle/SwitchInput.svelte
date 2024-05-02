<script lang="ts">
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import Switch from "./Switch.svelte";
  export let label: string;
  export let checked: boolean = false;
  export let width: string = "max-w-md";
  export let info: FormLabelInfoTooltip | undefined = undefined;
</script>

<div class="flex w-full justify-between gap-6 items-center {width}">
  <FormControlLabel {label} {info} />
  <Switch bind:on={checked} />
</div>
