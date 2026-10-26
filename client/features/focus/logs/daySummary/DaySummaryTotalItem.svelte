<script lang="ts">
  import { properCase } from "@21n/shared-utils/text.utils";
  import { formatSeconds } from "@21n/ui/elements/time/duration-format";
  import { cn } from "@21n/ui/environment/presentation";

  let {
    value,
    type = "total"
  }: {
    value: number;
    type?: "total" | "focus" | "break";
  } = $props();
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
