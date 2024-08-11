<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import CloseButton from "$lib/client/elements/button/CloseButton.svelte";
  import view from "$lib/client/stores/view.store";
  import {
    ButtonStyle,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { createEventDispatcher, onMount } from "svelte";
  import { isPrimaryActionDisabled } from "./modal.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: IButtonParams | undefined = undefined;
  export let secondaryAction: IButtonParams | undefined = undefined;
  let isActionInProgress = false;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      const frontDialog = getTopDialog();
      console.log({ frontDialogId: frontDialog?.id, action, event: x.event });
      if (!frontDialog || action != frontDialog?.id) return;
      if (x.event === GlobalEvent.ESCAPE) {
        close();
      } else if (x.event === GlobalEvent.ENTER) {
        onPrimaryClick();
      }
    });
    return () => {
      appEventSub();
    };
  });
  export async function close(
    from: "primary" | "secondary" | "close" = "close"
  ) {
    if (isPreventAutoClose) {
      isActionInProgress = false;
      return false;
    }
    dispatch("close", from);
  }
  async function onPrimaryClick() {
    isActionInProgress = true;
    if (primaryAction?.callback) await primaryAction?.callback();
    close("primary");
  }
  function getTopDialog() {
    const dialogs = Array.from(document.querySelectorAll("dialog[open]"));
    if (dialogs.length === 0) {
      return null;
    }
    return dialogs[dialogs.length - 1];
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-2">
  {#if primaryAction}
    <Button
      type={primaryAction.variant ?? "primary"}
      icon={primaryAction.icon}
      style={primaryAction.style ?? ButtonStyle.DEFAULT}
      isLoading={isActionInProgress}
      isDisabled={$isPrimaryActionDisabled}
      on:click={onPrimaryClick}
      label={primaryAction.label}
    />
  {/if}
  {#if secondaryAction}
    <!-- <Button
      type={secondaryAction.variant ?? "secondary"}
      icon={secondaryAction.icon}
      on:click={() => {
        if (secondaryAction?.callback) secondaryAction?.callback();
        close();
      }}
    >
      {secondaryAction.label}
      {#if !$view.isPortrait && (secondaryAction.variant === ButtonVariant.SECONDARY || !secondaryAction.variant)}
        <span class=" text-b4">Esc</span>
      {/if}
    </Button> -->
    <CloseButton
      params={{
        ...secondaryAction,
        callback: () => {
          if (secondaryAction?.callback) secondaryAction.callback();
          return close("secondary");
        }
      }}
    />
  {:else if isShowClose}
    <Button on:click={() => close("close")} style={ButtonStyle.OUTLINED}>
      close
      {#if !$view.isPortrait}
        <span class="text-b3">Esc</span>
      {/if}
    </Button>
  {/if}
</div>
