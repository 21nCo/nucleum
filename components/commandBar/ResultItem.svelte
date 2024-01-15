<script lang="ts">
  export let isActive: boolean = false;
  let ref: HTMLElement;
  $: if (isActive && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
</script>

<button
  bind:this={ref}
  on:click
  class="w-full flex justify-between items-center px-4 py-2 h-14 {isActive &&
    'bg-bgs3'}"
>
  <slot />
</button>
