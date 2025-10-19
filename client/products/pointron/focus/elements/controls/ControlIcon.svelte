<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import view from "@21n/stores/view.store";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import { Size } from "@21n/types/size.enum";
  import { Display } from "@21n/types/view.type";
  import { cn } from "@21n/utils/ui.utils";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
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
    $activeSession.timeRemainingToTakeBreak != undefined &&
    $activeSession.timeRemainingToTakeBreak < 0;
</script>

<Icon
  {icon}
  size={iconSize}
  class={cn(
    {
      "stroke-abg": context !== SessionUIContext.FOCUS_PLAYER
    },
    context === SessionUIContext.FOCUS_PLAYER && {
      "text-cbg":
        $activeSession.state === SessionState.FOCUS_RUNNING &&
        !isBreakReminderMode,
      "text-abg":
        $activeSession.state !== SessionState.FOCUS_RUNNING ||
        isBreakReminderMode
    }
  )}
  isFilled={context === SessionUIContext.FOCUS_PLAYER}
/>
