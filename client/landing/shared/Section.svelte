<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  let className: string = "";
  export { className as class };
  // export let backgroundImage: string;
</script>

<div class="flex w-full items-center justify-center">
  <div
    class={cn(
      "w-[1440px] mo:min-w-[320px] flex flex-col items-center justify-start px-12 mo:px-6 py-12 mo:py-8",
      className
    )}
  >
    <slot />
  </div>
</div>
