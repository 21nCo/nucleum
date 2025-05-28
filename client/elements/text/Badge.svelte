<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { abg, bg, cn } from "$lib/client/utils/ui.utils";
  export let size: Size = Size.md;
  export let text: string | number;
  export let parentBgIndex: number = 1;
  export let isApplyCustomColor = false;
  export let isAccentColor = false;

  $: isGeneric =
    typeof text === "string" &&
    !["new", "soon", "planned", "beta", "trial"].includes(text.toLowerCase());
</script>

{#if typeof text === "number"}
  <div
    class={cn(
      "flex justify-center items-center rounded-full w-fit border default-typeface",
      {
        "px-1": text > 9,
        "bg-css2 border-ccs2": isApplyCustomColor,
        [abg()]: isAccentColor,
        "border-transparent": isAccentColor,
        [bg(parentBgIndex)]: !isApplyCustomColor && !isAccentColor,
        "border-brs3": !isApplyCustomColor && !isAccentColor,
        "min-w-5 min-h-5 text-b3": size === Size.md,
        "min-w-4 min-h-4 text-b4": size === Size.sm,
        "min-w-3 min-h-3 text-b5": size === Size.xs
      }
    )}
  >
    {text}
  </div>
{:else}
  <div
    class={cn("flex justify-center items-center min-w-fit rounded-md", {
      "bg-aps3 text-aps1 border border-aps2": ["new", "trial"].includes(
        text.toLowerCase()
      ),
      "bg-ass3 text-ass1 border border-ass1": ["beta"].includes(
        text.toLowerCase()
      ),
      "bg-ags3 text-ags1 border border-ags1": ["soon", "planned"].includes(
        text.toLowerCase()
      ),
      "border border-brs3": isGeneric,
      "text-fgs2": isGeneric && !isAccentColor && !isApplyCustomColor,
      "text-cbg border-cbg": isGeneric && (isAccentColor || isApplyCustomColor),
      "px-1.5 py-0.25 text-b4": size === Size.md,
      "px-1 py-0.25 text-b5": size === Size.sm
    })}
  >
    {text}
  </div>
{/if}
