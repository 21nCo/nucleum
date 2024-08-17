<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { Display } from "$lib/client/types/view.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { sessionStore } from "../../session.store";
  export let icon: string;
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let iconSize: Size.md | Size.lg | Size.xl = Size.xl;
  $: iconSize =
    context === SessionUIContext.PIP
      ? Size.md
      : context === SessionUIContext.FOCUS_PLAYER ||
          $view.display === Display.MO
        ? Size.lg
        : Size.xl;
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
</script>

<Icon
  {icon}
  size={iconSize}
  class={cn(
    {
      "stroke-abg": context !== SessionUIContext.FOCUS_PLAYER
    },
    context === SessionUIContext.FOCUS_PLAYER && {
      "fill-cbg":
        $sessionStore.state == SessionState.FOCUS_RUNNING &&
        !isBreakReminderMode,
      "fill-abg":
        $sessionStore.state != SessionState.FOCUS_RUNNING || isBreakReminderMode
    }
  )}
/>
