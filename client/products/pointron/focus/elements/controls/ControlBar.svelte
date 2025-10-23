<script lang="ts">
  import { Control } from "@21n/types/pointron/control.enum";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import ControlItem from "@21n/products/pointron/focus/elements/controls/ControlItem.svelte";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { SessionType } from "@21n/products/pointron/logs/log.type";
  import { appStore } from "@21n/stores/app.store";
  import { cn } from "@21n/utils/ui.utils";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let isOperationInProgress = false;
  $: controlItemProps = { context };
  async function controlClickHandler(event: any) {
    if (isOperationInProgress) return;
    isOperationInProgress = true;
    try {
      let control = event.detail.control;
      if (control === Control.START) {
        await activeSession.startSession();
      } else if (control === Control.BREAK) {
        await activeSession.startBreak();
      } else if (control === Control.FINISH) {
        if ($activeSession.state === SessionState.TIME_IS_UP) {
          await activeSession.finishSession();
        } else {
          await activeSession.finishSession();
        }
      } else if (control === Control.RESUME || control === Control.SKIPBREAK) {
        await activeSession.resumeSession();
      } else if (control === Control.EXTEND) {
        await activeSession.extendSession();
      } else if (control === Control.ABANDON) {
        appStore.runAction(PointronAction.ABANDON_SESSION);
      } else {
        $activeSession.state = SessionState.NOT_STARTED;
      }
    } finally {
      isOperationInProgress = false;
    }
  }
</script>

<div
  class={cn("flex flex-row items-center", {
    "gap-4":
      context === SessionUIContext.FOCUS_PLAYER ||
      context === SessionUIContext.PIP,
    "gap-8 mo:gap-6": context === SessionUIContext.DEFAULT
  })}
>
  {#if $activeSession.state === SessionState.NOT_STARTED}
    <ControlItem
      control={Control.START}
      isProminent={true}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.type === SessionType.PREDEFINED_INTERVALS}
    <ControlItem
      control={Control.ABANDON}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.FOCUS_RUNNING}
    <ControlItem
      control={Control.BREAK}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.FOCUS_COMPLETED}
    <ControlItem
      control={Control.SKIPBREAK}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.BREAK}
      isProminent={true}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.BREAK_RUNNING}
    <ControlItem
      control={Control.RESUME}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.BREAK_COMPLETED}
    <ControlItem
      control={Control.RESUME}
      isProminent={true}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.TIME_IS_UP}
    <ControlItem
      control={Control.EXTEND}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      isProminent={true}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {:else if $activeSession.state === SessionState.TIME_IS_RUNNING_OUT}
    <ControlItem
      control={Control.EXTEND}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.BREAK}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
    <ControlItem
      control={Control.FINISH}
      on:click={controlClickHandler}
      {...controlItemProps}
    />
  {/if}
</div>
