<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import CloseButton from "$lib/tidy/elements/button/CloseButton.svelte";
  import view from "$lib/tidy/stores/view.store";
  import { ButtonStyle, type ButtonParams } from "$lib/tidy/types/button.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  export let primaryAction: ButtonParams | undefined = undefined;
  export let secondaryAction: ButtonParams | undefined = undefined;
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
      isLoading={isActionInProgress}
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
