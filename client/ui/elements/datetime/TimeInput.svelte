<script lang="ts">
  let {
    value = $bindable(""),
    placeholder = "Time",
    onChange = undefined
  }: {
    value?: string;
    placeholder?: string;
    onChange?: ((event: CustomEvent<string>) => void) | undefined;
  } = $props();

  function handleChange() {
    const changeEvent = new CustomEvent<string>("change", {
      detail: value
    });
    onChange?.(changeEvent);
  }
</script>

<input
  type="time"
  bind:value
  onchange={handleChange}
  class="rounded-md outline-none p-2 bg-bgs2 focus:outline focus:outline-aps1 portrait:w-24 portrait:min-w-24 w-40 min-w-40"
  {placeholder}
/>
