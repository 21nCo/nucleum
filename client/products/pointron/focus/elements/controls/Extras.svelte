<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Placement } from "$lib/client/types/direction.enum";
  import context from "$lib/client/stores/context.store";
  import type { IPopoverRenderBaseParams } from "$lib/client/types/popover.type";
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  import { Display } from "$lib/client/types/view.type";
  import { fullScreen, player } from "$lib/client/components/modal/modal.store";
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
      // placement: Placement.TopCenter,
      offsetInPx: 4,
      isUseAbsolutePositioning: true
    }
  };
  function onFullScreenToggle() {
    if (!isInFullScreen) {
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
    icon="zen"
    tooltip="Think mode"
    {...buttonProps}
    on:click={() => {
      appStore.runAction(PointronAction.THINK_MODE);
    }}
  />
  {#if $activeSession.type != SessionType.PREDEFINED_INTERVALS}
    <Button
      icon="cross-circled"
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
    icon="settings"
    tooltip="Session settings"
    {...buttonProps}
    on:click={() => {
      appStore.runAction(PointronAction.SESSION_SETTINGS_MODAL);
    }}
  />
  <Button
    icon={isInFullScreen ? "collapse" : "full-screen"}
    tooltip={isInFullScreen ? "Exit full screen" : "Full screen"}
    {...buttonProps}
    on:click={onFullScreenToggle}
  />
</div>
