<script lang="ts">
  import { Control } from "$lib/client/types/pointron/control.enum";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import ControlItem from "./ControlItem.svelte";
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { SessionType } from "$lib/client/components/pointron/logs/log.type";
  import { appStore } from "$lib/client/stores/app.store";
  export let color: number | undefined = undefined;
  export let size: Size = Size.md;
  const dispatch = createEventDispatcher();
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
      appStore.runAction(PointronEventEnum.ABANDON_SESSION);
    } else {
      $sessionStore.state = SessionState.NOT_STARTED;
    }
  }
</script>

<div
  class="flex flex-row items-center {size === Size.lg || size === Size.xl
    ? 'gap-12'
    : size === Size.md
      ? 'gap-10'
      : 'gap-4'} "
>
  <div
    class="flex items-center {size === Size.lg || size === Size.xl
      ? 'gap-8'
      : size === Size.md
        ? 'gap-6'
        : 'gap-4'}"
  >
    <!-- {#if size != Size.sm}
      <ControlItem
        control={Control.ABANDON}
        {color}
        on:click={controlClickHandler}
        {size}
      />
    {/if} -->
    {#if $sessionStore.state === SessionState.NOT_STARTED}
      <ControlItem
        control={Control.START}
        {color}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.type === SessionType.PREDEFINED_INTERVALS}
      <ControlItem
        control={Control.ABANDON}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.FOCUS_RUNNING}
      <ControlItem
        control={Control.BREAK}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.FOCUS_COMPLETED}
      <ControlItem
        control={Control.SKIPBREAK}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.BREAK}
        {color}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.BREAK_RUNNING}
      <ControlItem
        control={Control.RESUME}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.BREAK_COMPLETED}
      <ControlItem
        control={Control.RESUME}
        {color}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.TIME_IS_UP}
      <ControlItem
        control={Control.EXTEND}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.TIME_IS_RUNNING_OUT}
      <ControlItem
        control={Control.EXTEND}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.BREAK}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        {color}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {/if}
  </div>
</div>
