<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import CloseButton from "$lib/client/elements/button/CloseButton.svelte";
  import view from "$lib/client/stores/view.store";
  import {
    ButtonStyle,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";
  import {valid} from "$lib/client/products/pointron/logs/log.store"
  const dispatch = createEventDispatcher();
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: IButtonParams | undefined = undefined;
  export let secondaryAction: IButtonParams | undefined = undefined;
  let isActionInProgress = false;
  export async function close(
    from: "primary" | "secondary" | "close" = "close"
  ) {
    if (isPreventAutoClose) {
      isActionInProgress = false;
      return false;
    }
    dispatch("close", from);
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-4">
  {#if primaryAction}
    <Button
      type={primaryAction.variant ?? "primary"}
      icon={primaryAction.icon}
      style={primaryAction.style ?? ButtonStyle.DEFAULT}
      isLoading={isActionInProgress}
      isDisabled={!$valid}
      on:click={async () => {
        isActionInProgress = true;
        if (primaryAction?.callback) await primaryAction?.callback();
        close("primary");
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
      {#if !$view.isPortrait && (secondaryAction.variant === ButtonVariant.SECONDARY || !secondaryAction.variant)}
        <span class=" text-b4">Esc</span>
      {/if}
    </Button> -->
    <CloseButton
      params={{
        ...secondaryAction,
        callback: () => {
          if (secondaryAction?.callback) secondaryAction.callback();
          valid.set(true)
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
