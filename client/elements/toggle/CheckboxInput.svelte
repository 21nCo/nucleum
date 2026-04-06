<script lang="ts">
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  let {
    label,
    checked = $bindable(false),
    width = "max-w-md"
  }: {
    label: string;
    checked?: boolean;
    width?: string;
  } = $props();
</script>

<div class="flex w-full gap-2 items-center {width}">
  <input type="checkbox" bind:checked />
  <FormControlLabel props={{ label }} />
</div>
