<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  export let size: Size = Size.md;
  export let text: string | number;
  export let parentBgIndex: number = 1;
  export let isApplyCustomColor = false;
</script>

{#if typeof text === "number"}
  <div
    class={cn(
      "flex justify-center items-center rounded-full text-fgs2 border border-brs3",
      isApplyCustomColor ? "bg-ccs2" : bg(parentBgIndex),
      {
        "w-5 h-5 text-b3": size === Size.md,
        "w-4 h-4 text-b4": size === Size.sm,
        "w-3 h-3 text-b5": size === Size.xs
      }
    )}
  >
    {text}
  </div>
{:else}
  <div
    class={cn("flex justify-center items-center min-w-fit rounded-md", {
      "bg-aps3 text-aps1 border border-aps2": text.toLowerCase() === "new",
      "bg-ass3 text-ass1 border border-ass1":
        text.toLowerCase() === "soon" || text.toLowerCase() === "planned",
      "text-fgs2 border border-brs3": !["new", "soon", "planned"].includes(
        text.toLowerCase()
      ),
      "px-1.5 py-0.25 text-b4": size === Size.md,
      "px-1 py-0.25 text-b5": size === Size.sm
    })}
  >
    {text}
  </div>
{/if}
