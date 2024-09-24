<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  export let backgroundImage: string = "";
  let className: string = "";
  export { className as class };
</script>

<div
  class={cn(
    "w-full max-w-[390px] min-h-[356px] rounded-[20px] p-7 bg-bgs2",
    className
  )}
  style="background-image: url('/backgroundMedia/{backgroundImage}.jpg');background-size:cover;"
>
  <slot />
</div>
