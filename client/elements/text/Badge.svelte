<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  export let size: Size = Size.md;
  export let text: string | number;
  export let parentBgIndex: number = 1;
</script>

<div
  class={cn(
    "flex justify-center items-center rounded-full text-fgs2 border border-brs3",
    bg(parentBgIndex),
    {
      "w-5 h-5 text-b3": size === Size.md,
      "w-4 h-4 text-b4": size === Size.sm
    }
  )}
>
  {text}
</div>
