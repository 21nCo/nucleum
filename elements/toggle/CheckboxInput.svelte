<script lang="ts">
  import FormControlLabel from "../text/FormControlLabel.svelte";
  import ToggleSwitch from "./ToggleSwitch.svelte";
  export let label: string;
  export let checked: boolean = false;
</script>

<div class="flex w-full max-w-md justify-between gap-6 items-center">
  <FormControlLabel {label} />
  <ToggleSwitch bind:checked />
</div>
