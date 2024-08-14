<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { Display } from "$lib/client/types/view.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { sessionStore } from "../../session.store";
  export let icon: string;
  export let isFocusPlayerContext: boolean = false;
  let iconSize: Size.lg | Size.xl = Size.xl;
  $: iconSize =
    isFocusPlayerContext || $view.display === Display.MO ? Size.lg : Size.xl;
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
</script>

<Icon
  {icon}
  size={iconSize}
  class={cn({
    "fill-cbg":
      isFocusPlayerContext &&
      $sessionStore.state == SessionState.FOCUS_RUNNING &&
      !isBreakReminderMode,
    "fill-abg":
      isFocusPlayerContext &&
      ($sessionStore.state != SessionState.FOCUS_RUNNING ||
        isBreakReminderMode),
    "stroke-abg": !isFocusPlayerContext
  })}
/>
