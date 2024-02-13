<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import CloseButton from "$lib/tidy/elements/button/CloseButton.svelte";
  import { modalEvent, windowObject } from "$lib/tidy/stores/app.store";
  import type { ButtonParams } from "$lib/tidy/types/button.type";
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: ButtonParams | undefined = undefined;
  export let secondaryAction: ButtonParams | undefined = undefined;
  let isActionInProgress = false;
  export function close() {
    if (isPreventAutoClose) return;
    modalEvent.hide();
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-4">
  {#if primaryAction}
    <Button
      type={primaryAction.variant ?? "primary"}
      isLoading={isActionInProgress}
      on:click={async () => {
        isActionInProgress = true;
        if (primaryAction?.callback) await primaryAction?.callback();
        isActionInProgress = false;
        close();
      }}
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
      {#if !$windowObject.isInPortraitMode && (secondaryAction.variant === ButtonVariant.SECONDARY || !secondaryAction.variant)}
        <span class=" text-b4">Esc</span>
      {/if}
    </Button> -->
    <CloseButton
      params={{
        ...secondaryAction,
        callback: () => {
          if (secondaryAction?.callback) secondaryAction.callback();
          close();
          return Promise.resolve(true);
        }
      }}
    />
  {:else if isShowClose}
    <Button on:click={close}>
      close
      {#if !$windowObject.isInPortraitMode}
        <span class="text-b3">Esc</span>
      {/if}
    </Button>
  {/if}
</div>
