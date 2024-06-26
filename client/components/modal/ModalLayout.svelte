<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { Size } from "$lib/client/types/size.enum";
  import ModalFooter from "./ModalFooter.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import type { ModalParams } from "$lib/client/types/popup.type";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Action } from "$lib/client/types/action.enum";
  export let path: string;
  export let params: ModalParams;
  let size: Size = Size.md;
  if (params.layout?.size) size = params.layout.size;
  let footerRef: any;
  export function close() {
    footerRef.close();
  }
  function handleClose() {
    if (path === Action.CONFIRMATION) confirmationNotification.reset();
    else modalEvent.hideSpecific(path, "ModalLayout.svelte");
  }
</script>

{#if size === Size.full}
  <div
    class="w-full h-full flex justify-center items-center"
    in:fly={{
      duration: 400,
      delay: 0,
      easing: quintOut,
      x: 0,
      y: 100,
      opacity: 0
    }}
  >
    {#if $context.embed === Embed.HANDSET && !$context.isSheet}
      <div class="flex flex-col w-full h-full gap-2 p-2">
        {#if params.title}
          <ModalHeader
            title={params.title}
            on:close={() => handleClose()}
            isShowClose={true}
          />
        {/if}
        <slot />
      </div>
    {:else}
      <slot />
    {/if}
  </div>
{:else}
  <div
    class={cn(
      "modal flex flex-col items-center justify-between w-full h-full",
      {
        "p-2 lg:p-4 gap-4": !params.layout?.ignoreSafeArea && size === Size.xs,
        "py-4 lg:py-6 px-3 tp:px-4 lg:px-6 gap-4 lg:gap-8":
          !params.layout?.ignoreSafeArea && size !== Size.xs
      }
    )}
    in:fly={{
      duration: 400,
      delay: 0,
      easing: quintOut,
      x: 0,
      y: 10,
      opacity: 0
    }}
  >
    {#if params.title && !$context.isSheet}
      <ModalHeader
        title={params.title}
        on:close={() => handleClose()}
        isShowClose={$context.embed === Embed.HANDSET
          ? true
          : params.layout?.isShowClose}
      />
    {/if}
    <div class="flex flex-col gap-4 w-full flex-grow">
      <slot />
    </div>
    {#if params.layout?.primaryAction || params.layout?.secondaryAction}
      <ModalFooter
        primaryAction={params.layout?.primaryAction}
        secondaryAction={params.layout?.secondaryAction}
        bind:this={footerRef}
        on:close={() => handleClose()}
        isShowClose={params.layout?.isShowClose}
      />
    {/if}
  </div>
{/if}

<style>
  @keyframes slideIn {
    0% {
      transform: translateY(100px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-slide {
    animation: slideIn 0.2s ease-in-out forwards;
  }
  @keyframes flyIn {
    0% {
      transform: translate(0px, 100px);
      opacity: 0;
    }
    100% {
      transform: translate(0px, 0px);
      opacity: 1;
    }
  }

  .modal-disabled {
    animation: flyIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
</style>
