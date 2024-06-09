<script lang="ts">
  export let value: number;
</script>

<div class="flex items-center justify-center p-2">
  <input
    type="range"
    min="0"
    max="6"
    bind:value
    on:click|stopPropagation
    on:input
    class="appearance-none w-20 h-1 rounded bg-aps2 text-aps1 focus:outline-none"
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
