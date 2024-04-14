<script lang="ts">
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import Switch from "./Switch.svelte";
  export let label: string;
  export let checked: boolean = false;
  export let variant: "checkbox" | "switch" = "switch";
  export let width: string = "max-w-md";
</script>

<div class="flex w-full justify-between gap-6 items-center {width}">
  <FormControlLabel {label} />
  {#if variant === "checkbox"}
    <input type="checkbox" {checked} />
  {:else if variant === "switch"}
    <Switch bind:on={checked} />
  {/if}
</div>
