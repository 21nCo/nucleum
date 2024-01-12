<script lang="ts">
  export let search: string = "";
  export let action: any;
  export let isActive: boolean = false;
  let ref: HTMLElement;
  $: if (isActive && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
  $: label =
    search && action?.label?.toLowerCase()?.includes(search.toLowerCase())
      ? action?.label.replace(
          new RegExp(search, "gi"),
          (matched: string) => `<span class="font-bold">${matched}</span>`
        )
      : action?.label;
</script>

<button
  bind:this={ref}
  on:click
  class="w-full flex justify-between items-center px-4 py-2 h-14 {isActive &&
    'bg-bgs3'}"
>
  <div>
    {#if action.type === "navigation"}
      Go to
    {/if}
    {@html label}
  </div>
  <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
    {action?.type}
  </div>
</button>
