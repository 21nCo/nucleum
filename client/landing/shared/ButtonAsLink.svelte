<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let label: string;
  let className: string = "";
  export { className as class };
</script>

<div
  class={cn("h-[36px] mt-6 max-w-fit p-0", className)}
  role="button"
  tabindex="0"
  on:click
  on:keypress
>
  <p
    class="text-[16px] tp:text-[20px] font-medium leading-[20px] text-center border-b border-fgs3 border-dashed"
  >
    {label}
  </p>
  <!-- <SvgIcon icon="long-arrow-right" size={Size.sm} class="ml-2" /> -->
</div>
