<script lang="ts">
  import { bottomModal, type IBottomModalState } from "@21n/components/bottomModal/bottomModal.store";
  import { onDestroy } from "svelte";
  import { fly, fade } from "svelte/transition";
  import type { ComponentType } from "svelte";
  import { properCase } from "@21n/shared-utils/text.utils";

  interface ComponentMap {
    [key: string]: ComponentType;
  }

  const componentMap: ComponentMap = {};

  let state = $state<IBottomModalState>({
    isOpen: false,
    componentKey: null,
    data: undefined
  });

  const unsubscribe = bottomModal.subscribe((newState) => {
    state = newState;
  });

  onDestroy(() => {
    unsubscribe();
  });

  function handleOverlayClick() {
    bottomModal.close();
  }

  function handleOverlayKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      bottomModal.close();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      bottomModal.close();
    }
  }

  const CurrentComponent = $derived(
    state.componentKey ? componentMap[state.componentKey] : null
  );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if state.isOpen}
  <div
    class="fixed inset-y-0 right-0 z-50 flex items-end justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm"
      transition:fade={{ duration: 200 }}
      onclick={handleOverlayClick}
      onkeydown={handleOverlayKeydown}
      role="button"
      tabindex="0"
    ></div>
    <div class="h-full w-full p-4">
      <div
        class="relative flex flex-col h-full bg-bgs1 rounded-md shadow-md"
        transition:fly={{ x: 400, duration: 250 }}
      >
        <div class="flex items-center justify-between p-4 border-b border-bgs2">
          <h2 id="modal-title" class="text-h4 text-fgs1">
            {properCase(state?.data?.title ?? state.componentKey ?? "")}
          </h2>
          <button
            class="p-2 rounded-full hover:bg-bgs2 transition-colors"
            onclick={handleOverlayClick}
            aria-label="Close modal"
          >
            <svg
              class="w-5 h-5 text-fgs2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grow overflow-y-auto max-h-[calc(100vh-4rem)]">
          {#if CurrentComponent}
            <CurrentComponent {...state.data} />
          {:else}
            <div class="p-4 text-center text-fgs2">
              Component "{state.componentKey}" not found
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
