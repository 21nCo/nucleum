<script lang="ts">
  import type { IActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";

  let {
    captureStore,
    isHomeContext = false,
    onFocusBody = undefined
  }: {
    captureStore: IActiveCaptureStore;
    isHomeContext?: boolean;
    onFocusBody?: (() => void) | undefined;
  } = $props();

  function focusBody() {
    onFocusBody?.();
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
    onChange={() => {
      captureStore.refreshEmptyState();
    }}
    onDebouncedChange={persistLabel}
    onEnter={() => {
      focusBody();
      captureStore.refreshEmptyState();
    }}
    onKeydown={(e) => {
      const event = e.detail;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusBody();
      }
    }}
  />
</div>
