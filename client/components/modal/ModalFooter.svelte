<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { createEventDispatcher, onMount } from "svelte";
  import modalEvent, { isPrimaryActionDisabled } from "./modal.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { resolveModalOnFront } from "$lib/client/utils/browser.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { logger } from "../debug/logger.client";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: IButtonParams | undefined = undefined;
  export let secondaryAction: IButtonParams | undefined = undefined;
  export let isDelegateClose: boolean = false;
  let isPrimaryActionInProgress = false;
  let error: string | undefined = undefined;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      const frontModal = resolveModalOnFront();
      logger.log({ frontModalId: frontModal?.id, action, event: x.event });
      if (!frontModal || action != frontModal?.id) return;
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
    if (isDelegateClose) dispatch("close", from);
    else modalEvent.hide(action);
  }
  async function onPrimaryClick() {
    logger.log({ at: "onPrimaryClick", action });
    isPrimaryActionInProgress = true;
    let result;
    if (primaryAction?.callback) result = await primaryAction?.callback();
    isPrimaryActionInProgress = false;
    console.log({ result });
    if (result && result.error) {
      error = result.error;
      return;
    }
    if ((!primaryAction?.callback || result) && !isPreventAutoClose)
      close("primary");
  }
  async function onSecondaryClick() {
    logger.log({ at: "onSecondaryClick", action });
    let result;
    if (secondaryAction?.callback) result = await secondaryAction?.callback();
    if (result && result.error) {
      error = result.error;
      return;
    }
    if ((!secondaryAction?.callback || result) && !isPreventAutoClose)
      close("secondary");
  }
</script>

<footer class="flex flex-col w-full gap-2 justify-center p-4 mo:pb-8">
  {#if error}
    <InlineErrorMessage bind:error />
  {/if}
  <div class="flex w-full gap-2 justify-center">
    {#if primaryAction}
      <Button
        type={primaryAction.variant ?? ButtonVariant.PRIMARY}
        icon={primaryAction.icon}
        style={primaryAction.style ?? ButtonStyle.DEFAULT}
        isLoading={isPrimaryActionInProgress}
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
        on:click={onSecondaryClick}
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
</footer>
