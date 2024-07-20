<script lang="ts">
  import { Orientation } from "../types/direction.enum";
  import { ColorStrength } from "../types/appearance.type";
  import { cn } from "../utils/ui.utils";
  export let colorStrength: ColorStrength = ColorStrength.Normal;
  export let orientation: Orientation = Orientation.Horizontal;
  export let thickness: number = 1;
</script>

<div
  class={cn("rounded-full", `border-${thickness}`, {
    "border-b w-full": orientation === Orientation.Horizontal,
    "border-r h-full": orientation === Orientation.Vertical,
    "border-brs1": colorStrength === ColorStrength.Subtle,
    "border-brs2": colorStrength === ColorStrength.Normal,
    "border-brs3": colorStrength === ColorStrength.Strong,
    "border-fgs3": colorStrength === ColorStrength.ExtraStrong
  })}
/>
