<script lang="ts">
  import { properCase } from "$lib/shared/utils/text.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let value: number;
  export let type: "total" | "focus" | "break" = "total";
</script>

<span class="flex gap-1 items-center text-b2 userdata">
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
