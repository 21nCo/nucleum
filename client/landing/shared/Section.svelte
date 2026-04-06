<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "@21n/utils/ui.utils";
  let { children }: { children?: Snippet } = $props();
  let className: string = "";
  export { className as class };
</script>

<section class="flex w-full justify-center">
  <div
    class={cn(
      "w-[1440px] mo:min-w-[320px] flex flex-col gap-[102px] mo:gap-[60px] items-center justify-start px-12 mo:px-6 py-[74px] mo:py-10 max-w-full",
      className
    )}
  >
    {@render children?.()}
  </div>
</section>
