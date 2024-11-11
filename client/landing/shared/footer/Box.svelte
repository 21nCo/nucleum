<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  export let backgroundImage: string = "";
  let className: string = "";
  export { className as class };
</script>

<div
  class={cn(
    "relative flex flex-col w-full max-w-[390px] min-h-[356px] 2k:max-w-[450px] rounded-[20px] p-7 bg-bgs2",
    className,
    backgroundImage ? "bg-cover" : ""
  )}
  style="background-image: url('{backgroundImage}');background-size:cover;"
>
  {#if backgroundImage}
    <div class="absolute inset-0 bg-fgs1 opacity-40 rounded-[20px]"></div>
  {/if}
  <slot />
</div>
