<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import {
    confirmationNotification,
    modalEvent,
  } from "$lib/tidy/stores/app.store";
  import type { ButtonParams } from "$lib/tidy/types/button.type";
  export let path: string = "";
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: ButtonParams | undefined = undefined;
  export let secondaryAction: ButtonParams | undefined = undefined;
  export function close() {
    if (isPreventAutoClose) return;
    modalEvent.notify({
      path,
      isShow: false,
    });
    confirmationNotification.reset();
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-4">
  {#if primaryAction}
    <Button
      label={primaryAction.label}
      type={primaryAction.variant ?? "primary"}
      on:click={() => {
        if (primaryAction?.callback) primaryAction?.callback();
        close();
      }}
    />
  {/if}
  {#if secondaryAction}
    <Button
      label={secondaryAction.label}
      on:click={() => {
        if (secondaryAction?.callback) secondaryAction?.callback();
        close();
      }}
    />
  {:else if isShowClose}
    <Button label="close" on:click={close} />
  {/if}
</div>
