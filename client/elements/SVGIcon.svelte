<script lang="ts">
  import type { Size } from "../types/size.enum";
  import { cn } from "../utils/ui.utils";

  export let icon: string | null = null;
  export let size: Size | null = null;
  let className: string = "";
  export { className as class };
  const tailwindSizes: any = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-[1.25rem] h-[1.25rem]",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    xxl: "w-10 h-10",
    null: ""
  };
  function importIcon(icon: string) {
    return import(`../SVGIcons/${icon}.svg?raw`);
  }
</script>

{#if icon}
  <i class={cn(tailwindSizes[size], className)}>
    {#await importIcon(icon)}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" />
    {:then mod}
      {@html mod.default}
    {/await}</i
  >
{/if}
