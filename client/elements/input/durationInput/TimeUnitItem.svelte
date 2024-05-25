<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let unit: string;
  export let isActive: boolean = false;
  function onclick(event: MouseEvent) {
    dispatch("click", unit);
    event.stopPropagation();
  }
</script>

<button
  on:click={onclick}
  class="text-b3 leading-8 py-1 px-2 rounded-sm font-medium w-full cursor-pointer hover:bg-bgs3 text-left {isActive
    ? 'bg-bgs3'
    : ''}">{unit}</button
>
