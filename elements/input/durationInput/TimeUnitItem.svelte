<script lang="ts">
  export let isActive: boolean = false;
</script>

<button
  on:click
  on:keydown
  class={`text-[0.875rem] leading-8 py-1 px-2 rounded-sm font-medium w-full cursor-pointer hover:bg-bgs3 text-left ${
    isActive ? `bg-bgs3` : ``
  }`}><slot /></button
>
