<script lang="ts">
  import { Control } from "$lib/client/types/pointron/control.enum";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import ControlItem from "./ControlItem.svelte";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import { appStore } from "$lib/client/stores/app.store";
  export let size: Size = Size.md;
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
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.type === SessionType.PREDEFINED_INTERVALS}
      <ControlItem
        control={Control.ABANDON}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.FOCUS_RUNNING}
      <ControlItem
        control={Control.BREAK}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.FOCUS_COMPLETED}
      <ControlItem
        control={Control.SKIPBREAK}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.BREAK}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.BREAK_RUNNING}
      <ControlItem
        control={Control.RESUME}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.BREAK_COMPLETED}
      <ControlItem
        control={Control.RESUME}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.TIME_IS_UP}
      <ControlItem
        control={Control.EXTEND}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        isProminent={true}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {:else if $sessionStore.state === SessionState.TIME_IS_RUNNING_OUT}
      <ControlItem
        control={Control.EXTEND}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.BREAK}
        on:click={controlClickHandler}
        contextSize={size}
      />
      <ControlItem
        control={Control.FINISH}
        on:click={controlClickHandler}
        contextSize={size}
      />
    {/if}
  </div>
</div>
