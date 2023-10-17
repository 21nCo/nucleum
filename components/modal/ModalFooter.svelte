<script lang="ts">
  import Button from "$lib/tidy/elements/Button.svelte";
  import { modalEvent } from "$lib/tidy/stores/app.store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let path: string = "";
  export let primaryText: string | undefined = undefined;
  export let secondaryText: string | undefined = undefined;
  export let isShowClose: boolean = false;
  export let isPreventAutoClose: boolean = false;
  function close() {
    if (isPreventAutoClose) return;
    modalEvent.notify({
      path,
      isShow: false,
    });
  }
</script>

<div class="popover-footer flex gap-2 justify-center p-4">
  {#if primaryText}
    <Button
      label={primaryText}
      on:click={() => {
        dispatch("primary");
        close();
      }}
      type="primary"
    />
  {/if}
  {#if secondaryText}
    <Button
      label={secondaryText}
      on:click={() => {
        dispatch("secondary");
        close();
      }}
    />
  {:else if isShowClose}
    <Button label="close" on:click={close} />
  {/if}
</div>
