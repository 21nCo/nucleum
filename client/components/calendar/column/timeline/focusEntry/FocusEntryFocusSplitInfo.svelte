<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";

  export let splits: {
    focus: number;
    brek: number;
  };
  export let size: Size.sm | Size.md = Size.sm;
  $: total = splits.focus + splits.brek;
</script>

<div
  class={cn("flex gap-2 py-1 rounded-md", {
    "text-b3": size === Size.sm,
    "text-b2": size === Size.md
  })}
>
  <!-- <div class="min-w-fit text-fgs1">
      T:
      {formatSeconds(total)}
    </div> -->
  <div class="min-w-fit text-aps1">
    F:
    {formatSeconds(splits.focus)}
  </div>
  <div class="min-w-fit text-ass1">
    B:
    {formatSeconds(splits.brek)}
  </div>
</div>
