<!-- TODO - slider not supported on touch devices -->
<script lang="ts">
  let {
    value = $bindable(0),
    min = 0,
    max = 6,
    step = 1,
    onInput = undefined,
    onChange = undefined
  }: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    onInput?: ((event: Event) => void) | undefined;
    onChange?: ((event: Event) => void) | undefined;
  } = $props();
</script>

<div class="flex items-center justify-center p-2">
  <input
    type="range"
    {min}
    {max}
    {step}
    bind:value
    onclick={(event) => {
      event.stopPropagation();
    }}
    oninput={onInput}
    onchange={onChange}
    class="appearance-none w-full h-1 rounded bg-aps2 text-aps1 focus:outline-none"
  />
</div>

<style>
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 15px;
    height: 15px;
    background: rgba(var(--colors-aps1));
    border-radius: 50%;
    cursor: pointer;
  }
</style>
