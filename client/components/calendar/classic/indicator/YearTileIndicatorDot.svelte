<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  export let color: string;
  export let isActive: boolean = false;
  export let isMemory: boolean = false;
</script>

<div
  class={cn("rounded-full", {
    "w-1.5 h-1.5 border-[0.5px] border-brs2": isActive,
    "w-1 h-1": !isActive,
    [`bg-${color}`]: !isMemory,
    border: isMemory,
    "border-fgs3": !isActive && isMemory
  })}
></div>
