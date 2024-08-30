<script>
  import Icon from "$lib/client/elements/Icon.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
</script>

<button
  class="w-[115px] h-full border-r border-brs3 flex flex-col items-center justify-center p-4 text-center text-fgs3 text-base leading-5"
>
  <SvgIcon icon="long-arrow-left" size={Size.lg} />
  Built at Blank.coop
</button>
