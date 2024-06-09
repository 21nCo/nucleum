<script lang="ts">
  import { properCase } from "$lib/client/utils/text.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let value: number;
  export let type: "total" | "focus" | "break" = "total";
</script>

<span class="flex gap-1 items-center text-b3">
  <span class="text-fgs3"> {properCase(type)}:</span>
  <span
    class={cn({
      "text-aps1": type === "focus",
      "text-ass1": type === "break"
    })}
  >
    {formatSeconds(value)}
  </span>
</span>
