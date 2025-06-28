<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import view from "$lib/client/stores/view.store";

  export let label: string;
  export let value: number;
  export let isAccent: boolean = false;
  export let callback: (() => void) | undefined = undefined;
</script>

<button
  class={cn(
    "flex flex-col items-start justify-between border border-brs3 rounded-md min-w-fit grow",
    {
      "p-2 h-20 bg-bgs2": $view.isPortrait,
      "p-2 h-20 dp:p-4 dp:h-[7rem]": !$view.isPortrait,
      "cursor-pointer hover:bg-bgs2": callback,
      "cursor-default": !callback
    }
  )}
  on:click={callback}
>
  <div
    class={cn({
      "text-b2": $view.isPortrait
    })}
  >
    {label}
  </div>
  <div class="flex gap-2 items-center">
    <div
      class={cn("font-medium min-w-fit text-base dp:text-h3 2k:text-h2", {
        "text-aps1": isAccent
      })}
    >
      {value}
    </div>
  </div>
</button>
