<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { IActiveCaptureStore } from "./capture.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  export let captureStore: IActiveCaptureStore;
  export let isHomeContext: boolean = false;
  const dispatch = createEventDispatcher();

  function focusBody() {
    dispatch("focusBody");
  }

  function persistLabel() {
    if ($captureStore.isSaving || $captureStore.isAvoidSaveLeaks) return;
    captureStore.modify(
      { label: $captureStore.label },
      { isPreventBackPropagation: true }
    );
  }
</script>

<div
  class={cn("font-medium w-full", {
    "text-h3": !isHomeContext,
    "text-h4": isHomeContext
  })}
>
  <TextInput
    bind:value={$captureStore.label}
    style={InputStyle.PLAIN}
    id="capture-title"
    isExperimentalMdInput={true}
    placeholder="Title"
    isPreventDefaultOnEnter={true}
    on:change={() => {
      captureStore.refreshEmptyState();
    }}
    on:debouncedChange={persistLabel}
    on:enter={() => {
      focusBody();
      captureStore.refreshEmptyState();
    }}
    on:keydown={(e) => {
      const event = e.detail;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusBody();
      }
    }}
  />
</div>
