<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let label: string;
  let className: string = "";
  export { className as class };
</script>

<div
  class={cn("max-w-fit p-0", className)}
  role="button"
  tabindex="0"
  on:click
  on:keypress
>
  <p
    class="text-[16px] font-medium text-center border-b border-fgs3 border-dashed hover:text-aps1"
  >
    {label}
  </p>
  <!-- <SvgIcon icon="long-arrow-right" size={Size.sm} class="ml-2" /> -->
</div>
