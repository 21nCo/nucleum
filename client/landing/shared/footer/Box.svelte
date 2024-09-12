<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  export let backgroundImage: string = "";
</script>

<div
  class={cn("w-full max-w-[390px] min-h-[356px] rounded-[20px] p-7 bg-bgs2")}
  style="background-image: url('/backgroundMedia/{backgroundImage}.jpg');background-size:cover;"
>
  <slot />
</div>
