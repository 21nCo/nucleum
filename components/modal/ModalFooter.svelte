<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import {
    confirmationNotification,
    modalEvent,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import {
    ButtonVariant,
    type ButtonParams
  } from "$lib/tidy/types/button.type";
  export let path: string = "";
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: ButtonParams | undefined = undefined;
  export let secondaryAction: ButtonParams | undefined = undefined;
  export function close() {
    if (isPreventAutoClose) return;
    modalEvent.notify({
      path,
      isShow: false
    });
    confirmationNotification.reset();
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-4">
  {#if primaryAction}
    <Button
      type={primaryAction.variant ?? "primary"}
      on:click={() => {
        if (primaryAction?.callback) primaryAction?.callback();
        close();
      }}
    >
      {primaryAction.label}
      <!-- TODO: enter icon -->
      <!-- {#if !$windowObject.isInPortraitMode}
        <span class="text-bgs3 text-b4">Enter</span>
      {/if} -->
    </Button>
  {/if}
  {#if secondaryAction}
    <Button
      type={secondaryAction.variant ?? "secondary"}
      icon={secondaryAction.icon}
      on:click={() => {
        if (secondaryAction?.callback) secondaryAction?.callback();
        close();
      }}
    >
      {secondaryAction.label}
      {#if !$windowObject.isInPortraitMode && (secondaryAction.variant === ButtonVariant.SECONDARY || !secondaryAction.variant)}
        <span class=" text-b4">Esc</span>
      {/if}
    </Button>
  {:else if isShowClose}
    <Button on:click={close}>
      close
      {#if !$windowObject.isInPortraitMode}
        <span class="text-b3">Esc</span>
      {/if}
    </Button>
  {/if}
</div>
