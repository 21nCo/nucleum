<script lang="ts">
  import { Size } from "../types/size.enum";
  import { cn } from "../utils/ui.utils";

  export let icon: string | null = null;
  export let size: Size | "5xl" = Size.lg;
  export let isRenderRaw: boolean = false;
  const tailwindSizes: any = {
    xxs: "w-2 h-2",
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-[1.25rem] h-[1.25rem]",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    xxl: "w-10 h-10",
    "5xl": "w-16 h-full"
  };
  function importIcon(icon: string) {
    return import(`../SVGIcons/${icon}.svg?raw`);
  }
</script>

{#if icon && !isRenderRaw}
  <button on:click class={cn(tailwindSizes[size])}>
    {#await importIcon(icon)}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" />
    {:then mod}
      {@html mod.default}
    {/await}
  </button>
{:else if icon && isRenderRaw}
  {#await importIcon(icon)}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" />
  {:then mod}
    {@html mod.default}
  {/await}
{/if}
