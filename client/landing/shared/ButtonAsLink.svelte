<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
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
