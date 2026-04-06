<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

  let {
    unit,
    isActive = false,
    onclick = undefined
  }: {
    unit: string;
    isActive?: boolean;
    onclick?: ((event: CustomEvent<string>) => void) | undefined;
  } = $props();
  function handleClick(event: MouseEvent) {
    onclick?.(new CustomEvent("click", { detail: unit }));
    event.stopPropagation();
  }
</script>

<button
  onclick={handleClick}
  class={cn(
    "text-b2 leading-8 py-1 px-2 w-full cursor-pointer notouch:hover:bg-bgs2 active:bg-bgs2 text-left",
    {
      "bg-bgs2": isActive
    }
  )}>{unit}</button
>
