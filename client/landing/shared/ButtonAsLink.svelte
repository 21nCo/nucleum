<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let label: string;
  let className: string = "";
  export { className as class };
</script>

<div
  class={cn(
    "flex items-center justify-end min-w-[145px] h-[36px] border-b border-fgs3 border-dashed pb-0 mt-6",
    className
  )}
  role="button"
  tabindex="0"
  on:click
  on:keypress
>
  <p class="text-[16px] leading-9 text-center">{label}</p>
  <SvgIcon icon="long-arrow-right" size={Size.sm} class="ml-2" />
</div>
