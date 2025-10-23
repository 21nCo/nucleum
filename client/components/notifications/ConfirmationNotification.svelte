<script lang="ts">
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { confirmationNotification } from "@21n/stores/notification.store";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { Action } from "@21n/types/action.enum";
  import { AlertType } from "@21n/types/notification.type";
  import { Orientation } from "@21n/types/direction.enum";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";
  import { Size } from "@21n/types/size.enum";
  let confirmationTextInput: string | undefined;
  let error: string | undefined;
  function resolvePrimaryAction() {
    if ($confirmationNotification?.confirmAction) {
      if ($confirmationNotification.askInputConfirmation) {
        return {
          ...$confirmationNotification.confirmAction,
          callback: () => {
            if (
              confirmationTextInput ===
              $confirmationNotification.askInputConfirmation
            ) {
              confirmationNotification.reset();
              return (
                $confirmationNotification.confirmAction?.callback?.() ??
                Promise.resolve(true)
              );
            } else {
              error = "Please enter input to confirm";
              return Promise.resolve(false);
            }
          }
        };
      }
      return {
        ...$confirmationNotification.confirmAction,
        callback: async () => {
          confirmationNotification.reset();
          return (
            $confirmationNotification.confirmAction?.callback?.() ??
            Promise.resolve(true)
          );
        }
      };
    } else if ($confirmationNotification?.type === AlertType.ERROR) {
      return {
        label: "OK",
        callback: async () => {
          confirmationNotification.reset();
          return Promise.resolve(true);
        }
      };
    }
    return undefined;
  }
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <ModalContentPadded
    isExtraSmall={true}
    class="flex flex-col justify-between h-full gap-2"
  >
    <div class="text-b1">
      {@html renderMdAsHtml($confirmationNotification?.message ?? "")}
    </div>
    {#if $confirmationNotification?.askInputConfirmation}
      <InlineErrorMessage bind:error />
      <TextInput
        bind:value={confirmationTextInput}
        placeholder={$confirmationNotification?.askInputConfirmation}
        label={{
          label: `Please type "${$confirmationNotification?.askInputConfirmation}" to confirm`,
          orientation: Orientation.Vertical
        }}
      />
    {/if}
  </ModalContentPadded>
  <ModalFooter
    size={Size.sm}
    action={Action.CONFIRMATION}
    primaryAction={resolvePrimaryAction()}
    secondaryAction={$confirmationNotification?.cancelAction ??
      ($confirmationNotification?.type !== AlertType.ERROR
        ? {
            label: "Cancel",
            callback: async () => {
              confirmationNotification.reset();
              return Promise.resolve(true);
            }
          }
        : undefined)}
  />
</div>
