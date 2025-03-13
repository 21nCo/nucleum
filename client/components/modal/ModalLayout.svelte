<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import {
    appEvents,
    confirmationNotification
  } from "$lib/client/stores/notification.store";
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
  import { onMount } from "svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { resolveModalOnFront } from "$lib/client/utils/browser.utils";
  import { logger } from "../debug/logger.client";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import { ResourceAccessMode } from "../flux/resourceStores/resource.type";

  export let path: string;
  export let resource: string | undefined = undefined;
  export let params: ModalParams;
  export let isInFocusMode = false;
  let size: Size = Size.md;
  if (params.layout?.size) size = params.layout.size;
  let footerRef: any;
  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      const frontModal = resolveModalOnFront();
      logger.log({
        frontModalId: frontModal?.id,
        path,
        event: x.event
      });
      if (!frontModal || path != frontModal?.id) return;
      if (x.event === GlobalEvent.ESCAPE) {
        handleClose();
      }
    });
    return () => {
      appEventSub();
    };
  });

  export function close() {
    footerRef.close();
  }
  function handleClose(accessMode?: ResourceAccessMode) {
    if (path === Action.CONFIRMATION) confirmationNotification.reset();
    else if (resource)
      appStore.closeResource({
        inlineRestoreId: resource,
        accessMode: accessMode
      });
    else modalEvent.hide(path, "ModalLayout.svelte");
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
      "relative modal flex flex-col items-center justify-between w-full h-full",
      {
        "gap-4": !params.layout?.ignoreSafeArea && size === Size.xs,
        "gap-4 lg:gap-6": !params.layout?.ignoreSafeArea && size !== Size.xs,
        "pt-6": !params.title && !params.layout?.ignoreSafeArea
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
    <div
      class={cn(
        "flex flex-col gap-4 w-full flex-grow overflow-hidden mo:rounded-none rounded-md",
        {
          "p-2 lg:p-4": !params.layout?.ignoreSafeArea && size === Size.xs,
          "px-3 tp:px-8 lg:px-12":
            !params.layout?.ignoreSafeArea && size !== Size.xs
        }
      )}
    >
      <slot />
    </div>
    {#if params.layout?.primaryAction || params.layout?.secondaryAction}
      <ModalFooter
        action={path}
        primaryAction={params.layout?.primaryAction}
        secondaryAction={params.layout?.secondaryAction}
        isDelegateClose={true}
        bind:this={footerRef}
        on:close={() => handleClose()}
        isShowClose={params.layout?.isShowClose}
      />
    {/if}
    {#if params.layout?.isShowCantileverClose && !isInFocusMode}
      <button
        class="absolute top-2 -right-10 bg-ars1 w-10 h-12 rounded-r-md flex justify-center items-center hover:brightness-110"
        on:click={() => handleClose(ResourceAccessMode.POP)}
        use:tooltip={{ text: "Close", direction: Placement.Left }}
      >
        <Icon icon="ph:x-light" size={Size.lg} class="stroke-abg" />
      </button>
    {/if}
    {#if params.layout?.isShowBackButton && !isInFocusMode}
      <button
        class="absolute top-16 -right-10 bg-bgs4 w-10 h-12 rounded-r-md flex justify-center items-center hover:brightness-110"
        on:click={() => appStore.goBack(resource)}
        use:tooltip={{ text: "Go back", direction: Placement.Left }}
      >
        <Icon
          icon="ph:arrow-bend-down-left-light"
          size={Size.lg}
          class="stroke-fgs1"
        />
      </button>
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
