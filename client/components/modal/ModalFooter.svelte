<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "@21n/types/button.type";
  import { createEventDispatcher, onMount } from "svelte";
  import modalEvent, {
    isPrimaryActionDisabled
  } from "@21n/components/modal/modal.store";
  import { appEvents } from "@21n/stores/notification.store";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { resolveModalOnFront } from "@21n/utils/browser.utils";
  import { Size } from "@21n/types/size.enum";
  import { logger } from "@21n/components/debug/logger.client";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { Action } from "@21n/types/action.enum";
  import ButtonGroup from "@21n/elements/button/ButtonGroup.svelte";
  import view from "@21n/stores/view.store";
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
        <ButtonGroup buttons={resolveButtons()} {size} isFooter={true} />
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
