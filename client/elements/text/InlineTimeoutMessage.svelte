<script lang="ts">
  import { AlertType } from "$lib/client/types/notification.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let message: string | null = null;
  export let type: AlertType = AlertType.INFO;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let isDissappear: boolean = true;
  let timer: any;
  $: if (message && isDissappear) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      message = null;
    }, 4000);
  }
</script>

<div class="h-6 w-full flex justify-center">
  {#if message}
    <div
      class={cn({
        "text-ars1": type === AlertType.ERROR,
        "text-ass1": type === AlertType.WARNING,
        "text-ags1": type === AlertType.SUCCESS,
        "text-fgs2": type === AlertType.INFO,
        "text-base": size === Size.lg,
        "text-b2": size === Size.md,
        "text-b3": size === Size.sm
      })}
    >
      {message}
    </div>
  {/if}
</div>
