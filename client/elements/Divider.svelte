<script lang="ts">
  import { borderClass } from "$lib/client/utils/theme.utils";
  import { Orientation } from "../types/direction.enum";
  import { ColorStrength } from "../types/appearance.type";
  import appearance from "../stores/appearance.store";
  export let colorStrength: ColorStrength = ColorStrength.Normal;
  export let orientation: Orientation = Orientation.Horizontal;
  export let thickness: number = 1;
</script>

<div
  class="{borderClass($appearance, colorStrength)} {orientation ===
  Orientation.Horizontal
    ? 'border-b w-full'
    : 'border-r h-full'} border-{thickness} rounded-full"
/>
