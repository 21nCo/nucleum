<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { createEventDispatcher, onMount } from "svelte";
  import { isPrimaryActionDisabled } from "./modal.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { resolveDialogOnFront } from "$lib/client/utils/browser.utils";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: IButtonParams | undefined = undefined;
  export let secondaryAction: IButtonParams | undefined = undefined;
  let isActionInProgress = false;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      const frontDialog = resolveDialogOnFront();
      console.log({ frontDialogId: frontDialog?.id, action, event: x.event });
      if (!frontDialog || action != frontDialog?.id) return;
      if (x.event === GlobalEvent.ENTER) {
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
    isActionInProgress = false;
    if (isPreventAutoClose) {
      return false;
    }
    dispatch("close", from);
  }
  async function onPrimaryClick() {
    isActionInProgress = true;
    if (primaryAction?.callback) await primaryAction?.callback();
    close("primary");
  }
</script>

<div class="popover-footer flex w-full gap-2 justify-center p-4">
  {#if primaryAction}
    <Button
      type={primaryAction.variant ?? ButtonVariant.PRIMARY}
      icon={primaryAction.icon}
      style={primaryAction.style ?? ButtonStyle.DEFAULT}
      isLoading={isActionInProgress}
      isDisabled={$isPrimaryActionDisabled}
      on:click={onPrimaryClick}
      label={primaryAction.label}
      shortcut={GlobalEvent.ENTER}
    />
  {/if}
  {#if secondaryAction}
    <Button
      type={secondaryAction.variant ?? ButtonVariant.SECONDARY}
      icon={secondaryAction.icon}
      size={secondaryAction.size ?? Size.md}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        if (secondaryAction?.callback) secondaryAction.callback();
        return close("secondary");
      }}
      label={secondaryAction?.label}
      shortcut={!secondaryAction.variant ||
      secondaryAction.variant === ButtonVariant.SECONDARY
        ? GlobalEvent.ESCAPE
        : undefined}
    />
  {:else if isShowClose}
    <Button
      on:click={() => close("close")}
      style={ButtonStyle.OUTLINED}
      label="Close"
      shortcut={GlobalEvent.ESCAPE}
    />
  {/if}
</div>
