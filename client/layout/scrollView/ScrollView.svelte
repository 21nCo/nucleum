<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let isRefreshOnPull: boolean = false;
  export let bottomSpacerSize: Size.sm | Size.md | Size.lg = Size.md;
  let classList: string | object = "";
  export { classList as class };
</script>

<!-- TODO - add pull refresh Gesture and refactor existing scroll views in Pointron: Analytics, Quick focus, Logs pane, goals layout - Memotron: Nodes list -->
<div
  class={cn(classList, "overflow-y-auto no-scrollbar", {
    "pb-60": bottomSpacerSize === Size.lg,
    "pb-40": bottomSpacerSize === Size.md,
    "pb-20": bottomSpacerSize === Size.sm
  })}
>
  <slot />
</div>
