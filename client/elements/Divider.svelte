<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { cn } from "@21n/utils/ui.utils";
    let {
    colorStrength = ColorStrength.Normal,
    orientation = Orientation.Horizontal,
    thickness = 1,
    text = undefined,
  }: {
    colorStrength?: ColorStrength;
    orientation?: Orientation;
    thickness?: number;
    text?: string | undefined;
  } = $props();

  
  
  
</script>

{#if text}
  <div class="flex w-full items-center gap-2">
    <svelte:self {colorStrength} {thickness} />
    <span class="text-fgs2 text-b3">{text}</span>
    <svelte:self {colorStrength} {thickness} />
  </div>
{:else}
  <div
    class={cn("rounded-full", `border-${thickness}`, {
      "border-b w-full": orientation === Orientation.Horizontal,
      "border-r h-full": orientation === Orientation.Vertical,
      "border-brs1": colorStrength === ColorStrength.Subtle,
      "border-brs2": colorStrength === ColorStrength.Normal,
      "border-brs3": colorStrength === ColorStrength.Strong,
      "border-fgs3 border-opacity-80":
        colorStrength === ColorStrength.ExtraStrong
    })}
  />
{/if}
