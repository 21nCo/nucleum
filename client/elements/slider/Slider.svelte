<script lang="ts">
  export let value: number;
  export let min = 0;
  export let max = 6;
  export let step = 1;
</script>

<div class="flex items-center justify-center p-2">
  <input
    type="range"
    {min}
    {max}
    {step}
    bind:value
    on:click|stopPropagation
    on:input
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
