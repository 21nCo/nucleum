<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  export let size: Size.sm | Size.md | Size.lg | Size.xl | Size.xs = Size.md;
</script>

<div
  class={cn({
    "pb-80": size === Size.xl,
    "pb-60": size === Size.lg,
    "pb-40": size === Size.md,
    "pb-20": size === Size.sm,
    "pb-10": size === Size.xs
  })}
/>
