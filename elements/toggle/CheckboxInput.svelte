<script lang="ts">
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import ToggleSwitch from "./ToggleSwitch.svelte";
  export let label: string;
  export let checked: boolean = false;
  export let width: string = "max-w-md";
</script>

<div class="flex w-full justify-between gap-6 items-center {width}">
  <FormControlLabel {label} />
  <ToggleSwitch bind:checked />
</div>
