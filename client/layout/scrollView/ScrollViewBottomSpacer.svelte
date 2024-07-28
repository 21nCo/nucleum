<script lang="ts">
  import { Size } from "../../types/size.enum";
  import { cn } from "../../utils/ui.utils";
  export let size: Size.sm | Size.md | Size.lg = Size.md;
</script>

<div
  class={cn({
    "pb-60": size === Size.lg,
    "pb-40": size === Size.md,
    "pb-20": size === Size.sm
  })}
/>
