<script lang="ts">
  import { Control } from "$lib/client/types/pointron/control.enum";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import ControlItem from "./ControlItem.svelte";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  export let isFocusPlayerContext: boolean = false;
  let controlItemProps = { isFocusPlayerContext };
  async function controlClickHandler(event: any) {
    let control = event.detail.control;
    if (control === Control.START) {
      await sessionStore.startSession();
    } else if (control === Control.BREAK) {
      await sessionStore.startBreak();
    } else if (control === Control.FINISH) {
      if ($sessionStore.state === SessionState.TIME_IS_UP) {
        await sessionStore.finishSession();
      } else {
        await sessionStore.finishSession();
      }
    } else if (control === Control.RESUME || control === Control.SKIPBREAK) {
      await sessionStore.resumeSession();
    } else if (control === Control.EXTEND) {
      await sessionStore.extendSession();
    } else if (control === Control.ABANDON) {
      appStore.runAction(PointronAction.ABANDON_SESSION);
    } else {
      $sessionStore.state = SessionState.NOT_STARTED;
    }
  }
</script>

<div
  class={cn("flex flex-row items-center", {
    "gap-4": isFocusPlayerContext,
    "gap-8 mo:gap-6": !isFocusPlayerContext
  })}
>
  {#if $sessionStore.state === SessionState.NOT_STARTED}
    <ControlItem
      control={Control.START}
      isProminent={true}
      on:click={controlClickHandler}
    />
  {:else if $sessionStore.type === SessionType.PREDEFINED_INTERVALS}
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
  {:else if $sessionStore.state === SessionState.FOCUS_RUNNING}
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
  {:else if $sessionStore.state === SessionState.FOCUS_COMPLETED}
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
  {:else if $sessionStore.state === SessionState.BREAK_RUNNING}
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
  {:else if $sessionStore.state === SessionState.BREAK_COMPLETED}
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
  {:else if $sessionStore.state === SessionState.TIME_IS_UP}
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
  {:else if $sessionStore.state === SessionState.TIME_IS_RUNNING_OUT}
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
