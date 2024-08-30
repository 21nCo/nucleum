<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  let className: string = "";
  export { className as class };
  // export let backgroundImage: string;
</script>

<div class="flex w-full items-center justify-center border border-rose-600">
  <div
    class={cn(
      "w-[1440px] flex flex-col items-center justify-center min-h-[93vh] px-12 py-12",
      className
    )}
  >
    <slot />
  </div>
</div>
