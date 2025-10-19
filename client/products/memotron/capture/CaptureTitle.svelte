<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { IActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
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
