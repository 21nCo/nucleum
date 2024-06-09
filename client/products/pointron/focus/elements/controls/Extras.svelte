<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { LaunchContext } from "$lib/client/types/appStore.type";
  import { Direction } from "$lib/client/types/direction.enum";
  export let isInFullScreen: boolean = false;
  let toolTipPlacement = Direction.Up;

  function onFullScreenToggle() {
    if (!isInFullScreen) {
      appStore.showFullScreenPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
    } else {
      appStore.hideFullScreenPlayer();
    }
  }
</script>

<div
  class="flex gap-4 rounded-full border border-brs3 p-2 w-full justify-around"
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
    {toolTipPlacement}
    on:click={() => {
      appStore.runAction(PointronEventEnum.THINK_MODE);
    }}
  />
  {#if $sessionStore.type != SessionType.PREDEFINED_INTERVALS}
    <Button
      icon="cross-circled"
      tooltip="Abandon focus session"
      {toolTipPlacement}
      on:click={() => {
        appStore.runAction(PointronEventEnum.ABANDON_SESSION);
      }}
    />
  {/if}
  {#if !$view.isPortrait && $appStore.launchContext != LaunchContext.EMBED}
    <Button
      icon="pip"
      tooltip="Picture in picture"
      {toolTipPlacement}
      on:click={() => {
        appStore.togglePip(PointronEventEnum.FOCUS_PLAYER);
      }}
    />
  {/if}
  <Button
    icon="settings"
    tooltip="Session settings"
    {toolTipPlacement}
    on:click={() => {
      appStore.runAction(PointronEventEnum.SESSION_SETTINGS_MODAL);
    }}
  />
  <Button
    icon={isInFullScreen ? "collapse" : "full-screen"}
    tooltip={isInFullScreen ? "Exit full screen" : "Full screen"}
    {toolTipPlacement}
    on:click={onFullScreenToggle}
  />
</div>
