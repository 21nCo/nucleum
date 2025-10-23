<script lang="ts">
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  export let label: string;
  export let checked: boolean = false;
  export let width: string = "max-w-md";
</script>

<div class="flex w-full gap-2 items-center {width}">
  <input type="checkbox" bind:checked />
  <FormControlLabel props={{ label }} />
</div>
