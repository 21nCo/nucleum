<script lang="ts">
  export let label: string;
  export let isActive: boolean = false;
  let itemRef: HTMLButtonElement;
  $: if (isActive && itemRef)
    itemRef.scrollIntoView({ behavior: "smooth", block: "end" });
</script>

<button
  bind:this={itemRef}
  on:click
  class="p-2 truncate w-full h-10 min-h-[2.5rem] hover:bg-bgs3 flex {isActive
    ? ' bg-bgs3 bg-opacity-70 font-medium'
    : ''}"
>
  {label}
</button>
