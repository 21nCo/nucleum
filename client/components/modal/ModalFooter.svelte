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
  import { KeyboardKey, ModifierKey } from "$lib/client/types/keyboard.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Action } from "$lib/client/types/action.enum";
  import ButtonGroup from "$lib/client/elements/button/ButtonGroup.svelte";
  import view from "$lib/client/stores/view.store";
  const dispatch = createEventDispatcher();
  export let action: string;
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: IButtonParams | undefined = undefined;
  export let secondaryAction: IButtonParams | undefined = undefined;
  export let buttons: IButtonParams[] | undefined = undefined;
  export let isDelegateClose: boolean = false;
  export let orientation: Orientation = Orientation.Horizontal;
  export let isHideSecondaryShortcut: boolean = false;
  export let error: string | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  const dev_isUseExpandedButtons = !$view.isConstrainedWidth;
  let isPrimaryActionInProgress = false;

  function resolveButtons() {
    let _buttons = buttons;
    if (_buttons && _buttons.length > 0) return _buttons;
    if (primaryAction)
      _buttons = [
        {
          ...primaryAction,
          variant: primaryAction.variant ?? ButtonVariant.PRIMARY,
          style:
            !primaryAction.variant ||
            primaryAction.variant === ButtonVariant.PRIMARY
              ? ButtonStyle.OUTLINED
              : (primaryAction.style ?? ButtonStyle.DEFAULT),
          shortcut: primaryAction.shortcut ?? {
            key: KeyboardKey.ENTER,
            modifiers: [ModifierKey.META]
          },
          callback: onPrimaryClick,
          isLoading: isPrimaryActionInProgress,
          isDisabled: $isPrimaryActionDisabled
        }
      ];
    if (secondaryAction) {
      _buttons = [
        ...(_buttons ?? []),
        {
          ...secondaryAction,
          variant: secondaryAction.variant ?? ButtonVariant.SECONDARY,
          style: secondaryAction.style ?? ButtonStyle.OUTLINED,
          callback: onSecondaryClick,
          shortcut:
            !isHideSecondaryShortcut &&
            (!secondaryAction.variant ||
              secondaryAction.variant === ButtonVariant.SECONDARY)
              ? Action.CLOSE
              : undefined
        }
      ];
    } else if (isShowClose) {
      _buttons = [
        ...(_buttons ?? []),
        {
          label: "Close",
          callback: () => close("close"),
          shortcut: Action.CLOSE
        }
      ];
    }
    return _buttons;
  }

  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      const frontModal = resolveModalOnFront();
      logger.log({ frontModalId: frontModal?.id, action, event: x.event });
      if (!frontModal || action != frontModal?.id) return;
      if (x.event === GlobalEvent.ENTER && x.value.metaKey === true) {
        onPrimaryClick(x.value);
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
  async function onPrimaryClick(event?: any) {
    logger.log({ at: "onPrimaryClick", action });
    isPrimaryActionInProgress = true;
    let result;
    if (primaryAction?.callback) result = await primaryAction?.callback(event);
    isPrimaryActionInProgress = false;
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

<footer
  class={cn("flex flex-col w-full gap-2 justify-center mo:pb-8", {
    "p-4": !dev_isUseExpandedButtons,
    "rounded-b-md overflow-clip": dev_isUseExpandedButtons
  })}
>
  {#if error}
    <InlineErrorMessage bind:error />
  {/if}
  <div
    class={cn("flex w-full gap-2", {
      "flex-col mx-auto": orientation === Orientation.Vertical,
      "justify-center": !dev_isUseExpandedButtons
    })}
  >
    {#if dev_isUseExpandedButtons}
      {#key `${$isPrimaryActionDisabled}-${isPrimaryActionInProgress}`}
        <ButtonGroup buttons={resolveButtons()} {size} />
      {/key}
    {:else}
      {#if primaryAction}
        <Button
          type={primaryAction.variant ?? ButtonVariant.PRIMARY}
          icon={primaryAction.icon}
          style={primaryAction.style ?? ButtonStyle.DEFAULT}
          isLoading={isPrimaryActionInProgress}
          isDisabled={$isPrimaryActionDisabled}
          size={primaryAction.size ?? Size.md}
          on:click={onPrimaryClick}
          label={primaryAction.label}
          shortcut={primaryAction.shortcut ?? {
            key: KeyboardKey.ENTER,
            modifiers: [ModifierKey.META]
          }}
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
          shortcut={!isHideSecondaryShortcut &&
          (!secondaryAction.variant ||
            secondaryAction.variant === ButtonVariant.SECONDARY)
            ? Action.CLOSE
            : undefined}
        />
      {:else if isShowClose}
        <Button
          on:click={() => close("close")}
          style={ButtonStyle.OUTLINED}
          label="Close"
          shortcut={Action.CLOSE}
        />
      {/if}
    {/if}
  </div>
</footer>
