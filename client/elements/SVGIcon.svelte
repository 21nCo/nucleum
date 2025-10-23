<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";

  export let icon: string | null = null;
  export let size: Size | "5xl" | "fit" = Size.lg;
  export let phIconSize:
    | Size.xs
    | Size.sm
    | Size.md
    | Size.lg
    | Size.xl
    | Size.xxl = Size.sm;
  export let isRenderRaw: boolean = false;
  const tailwindSizes: any = {
    xxs: "w-2 h-2",
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-[1.25rem] h-[1.25rem]",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    xxl: "w-10 h-10",
    "5xl": "w-16 h-full",
    fit: "w-fit h-fit"
  };
  export let isAccentBg: boolean = false;

  function importIcon(icon: string) {
    return import(`../SVGIcons/${icon}.svg?raw`);
  }
</script>

{#if icon?.includes("ph:")}
  <Icon {icon} size={phIconSize} class={isAccentBg ? "text-bgs1" : ""} />
{:else if size === "fit" && icon}
  {#await importIcon(icon)}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" />
  {:then mod}
    {@html mod.default}
  {/await}
{:else if icon && !isRenderRaw}
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
