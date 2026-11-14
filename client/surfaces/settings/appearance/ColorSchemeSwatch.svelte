<script lang="ts">
  import type { ColorScheme } from "@21n/theme/appearance.type";
  import { cn } from "@21n/ui/environment/presentation";

  let {
    scheme,
    class: className = ""
  }: {
    scheme: ColorScheme | undefined;
    class?: string;
  } = $props();

  type SwatchColors = Record<string, string | undefined>;

  const colors = $derived.by(() => {
    if (!scheme) return [];
    const c = scheme.colors as SwatchColors;
    return [c.fbgs2 ?? c.bgs2, c.bgs1, c.fgs1, c.aps1].filter(
      (color): color is string => Boolean(color)
    );
  });
</script>

{#if scheme}
  <span
    class={cn(
      "flex h-5 w-12 shrink-0 overflow-hidden rounded border border-brs3",
      className
    )}
    aria-hidden="true"
    data-scheme-swatch={scheme.id}
  >
    {#each colors as color}
      <span class="flex-1" style:background-color={color}></span>
    {/each}
  </span>
{:else}
  <span
    class={cn(
      "flex h-5 w-12 shrink-0 rounded border border-dashed border-brs3",
      className
    )}
    aria-hidden="true"
  ></span>
{/if}
