<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { sessionStore } from "../../session.store";
  export let icon: string;
  export let isFocusPlayerContext: boolean = false;
  let iconSize: Size.lg | Size.xl = Size.xl;
  $: iconSize = isFocusPlayerContext ? Size.lg : Size.xl;
</script>

<Icon
  {icon}
  size={iconSize}
  class={cn({
    "fill-cbg":
      isFocusPlayerContext &&
      $sessionStore.currentBlock.type == BlockType.FOCUS,
    "fill-abg":
      isFocusPlayerContext &&
      $sessionStore.currentBlock.type != BlockType.FOCUS,
    "stroke-abg": !isFocusPlayerContext
  })}
/>
