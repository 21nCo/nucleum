<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let icon: string;
  export let contextSize: Size.sm | Size.md | Size.lg | Size.xl = Size.md;
  let iconSize: Size.sm | Size.md | Size.lg | Size.xl = Size.lg;
  $: iconSize =
    contextSize === Size.sm || contextSize === Size.md ? Size.lg : contextSize;
</script>

<Icon
  {icon}
  size={iconSize}
  class={cn({
    "fill-cbg": contextSize === Size.sm,
    "stroke-abg": contextSize != Size.sm
  })}
/>
