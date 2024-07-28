<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
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
      isFocusPlayerContext && $sessionStore.state == SessionState.FOCUS_RUNNING,
    "fill-abg":
      isFocusPlayerContext && $sessionStore.state != SessionState.FOCUS_RUNNING,
    "stroke-abg": !isFocusPlayerContext
  })}
/>
