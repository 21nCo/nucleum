<script lang="ts">
  export let isActive: boolean = false;
</script>

<button
  on:click
  on:keydown
  class={`text-b3 leading-8 py-1 px-2 rounded-sm font-medium w-full cursor-pointer hover:bg-bgs3 text-left ${
    isActive ? `bg-bgs3` : ``
  }`}><slot /></button
>
