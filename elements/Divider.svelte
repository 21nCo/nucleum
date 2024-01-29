<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { borderColor } from "$lib/tidy/utils/theme.utils";
  import { Orientation } from "../types/direction.enum";
  import { ColorStrength } from "../types/theme.type";
  export let colorStrength: ColorStrength = ColorStrength.Normal;
  export let orientation: Orientation = Orientation.Horizontal;
  export let thickness: number = 1;
</script>

<div
  class="{borderColor($userPreferences.theme, colorStrength)} {orientation ===
  Orientation.Horizontal
    ? 'border-b w-full'
    : 'border-r h-full'} border-{thickness} rounded-full"
/>
