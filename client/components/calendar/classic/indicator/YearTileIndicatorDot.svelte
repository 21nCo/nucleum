<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  export let color: string;
  export let isActive: boolean = false;
</script>

<div
  class={cn(" rounded-full", `bg-${color}`, {
    "w-1.5 h-1.5 border-[0.5px] border-brs2": isActive,
    "w-1 h-1": !isActive
  })}
></div>
