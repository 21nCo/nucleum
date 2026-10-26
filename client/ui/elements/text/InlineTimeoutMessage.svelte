<script lang="ts">
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  let {
    message = $bindable(null),
    type = "INFO",
    size = Size.md,
    isDissappear = true
  }: {
    message?: string | null;
    type?: string;
    size?: Size.sm | Size.md | Size.lg;
    isDissappear?: boolean;
  } = $props();
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  $effect(() => {
    if (!message || !isDissappear) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      message = null;
    }, 4000);
    return () => clearTimeout(timer);
  });
</script>

<div class="h-6 w-full flex justify-center">
  {#if message}
    <div
      class={cn({
        "text-ars1": type === "ERROR",
        "text-ass1": type === "WARNING",
        "text-ags1": type === "SUCCESS",
        "text-fgs2": type === "INFO",
        "text-base": size === Size.lg,
        "text-b2": size === Size.md,
        "text-b3": size === Size.sm
      })}
    >
      {message}
    </div>
  {/if}
</div>
