<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let label: string;
  export let icon: string;
</script>

<button
  class={cn(
    "w-[115px] h-full hover:text-aps1 flex flex-col items-center justify-center p-4 text-center text-fgs3 text-base leading-5",
    label == "Products" && "border border-brs2 hover:border-brs3"
  )}
  on:click
>
  <SvgIcon {icon} size={Size.lg} class="mb-2" />

  {label}
</button>
