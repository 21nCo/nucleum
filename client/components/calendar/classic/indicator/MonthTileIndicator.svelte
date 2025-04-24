<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  export let isActive: boolean = false;
  export let text: string;
  export let color: string = "fgs4";
</script>

<div
  class={cn("rounded-full px-1.5", `text-${color}`, {
    border: isActive,
    [`border-${color}`]: isActive
  })}
>
  {text}
</div>
