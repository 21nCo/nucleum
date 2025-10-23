<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { SessionType } from "@21n/products/pointron/logs/log.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Placement } from "@21n/types/direction.enum";
  import context from "@21n/stores/context.store";
  import type { IPopoverRenderBaseParams } from "@21n/types/popover.type";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  import { Display } from "@21n/types/view.type";
  import modalEvent, {
    fullScreen,
    player
  } from "@21n/components/modal/modal.store";
  export let isInFullScreen: boolean = false;
  export let parentBgIndex: number = 1;
  const buttonProps: {
    parentBgIndex: number;
    size: Size.sm | Size.md | Size.lg;
    tooltipOptions: IPopoverRenderBaseParams;
  } = {
    parentBgIndex,
    size:
      $view.display === Display.MO || $view.display === Display.TP
        ? Size.md
        : Size.lg,
    tooltipOptions: {
      placement: Placement.TopCenter,
      offsetInPx: 4,
      isUseAbsolutePositioning: true
    }
  };
  function onFullScreenToggle() {
    if (!isInFullScreen) {
      modalEvent.hide(PointronAction.FOCUS_MODAL);
      fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
    } else {
      fullScreen.hide();
    }
  }
</script>

<div
  class="flex gap-2 dp:gap-4 rounded-full border border-brs3 mo:px-2 py-1 dp:p-2 w-full justify-around"
>
  <!-- <Button
    icon="music"
    {size}
    tooltip="Background music"
    {toolTipPlacement}
    on:click={() => appStore.runAction(PointronEventEnum.BACKGROUND_MUSIC)}
  /> -->
  <Button
    icon="ph:flower-lotus-light"
    tooltip="Think mode"
    {...buttonProps}
    on:click={() => {
      appStore.runAction(PointronAction.THINK_MODE);
    }}
  />
  {#if $activeSession.type !== SessionType.PREDEFINED_INTERVALS}
    <Button
      icon="x-circle"
      tooltip="Abandon focus session"
      {...buttonProps}
      on:click={() => {
        appStore.runAction(PointronAction.ABANDON_SESSION);
      }}
    />
  {/if}
  {#if !$context.isEmbed}
    <Button
      icon="pip"
      tooltip="Picture in picture"
      {...buttonProps}
      on:click={() => {
        player.togglePip(PointronAction.FOCUS_PLAYER);
      }}
    />
  {/if}
  <Button
    icon={isInFullScreen ? "exitfullscreen" : "fullscreen"}
    tooltip={isInFullScreen ? "Exit full screen" : "Full screen"}
    {...buttonProps}
    on:click={onFullScreenToggle}
  />
</div>
