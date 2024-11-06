<script lang="ts">
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { AlertType } from "$lib/client/types/notification.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
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
  <div class="flex flex-col justify-between h-full gap-2">
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
  </div>
  <ModalFooter
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
