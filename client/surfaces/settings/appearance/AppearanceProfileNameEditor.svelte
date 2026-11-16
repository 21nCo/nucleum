<script lang="ts">
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    initialName = "",
    onSubmit,
    onCancel
  }: {
    initialName?: string;
    onSubmit: (name: string) => Promise<unknown> | void;
    onCancel: () => void;
  } = $props();

  let name = $state(initialName);
  let container = $state<HTMLDivElement | undefined>();
  // TextInput submits on Enter keyup. An editor opened by an Enter keydown
  // elsewhere (such as a menu item) receives that key's keyup, so only an
  // Enter that was also pressed down inside the editor submits.
  let isEnterPressedInside = false;
  let isSubmitting = false;

  $effect(() => {
    const input = container?.querySelector("input");
    input?.focus();
    input?.select();
  });

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    isSubmitting = true;
    try {
      await onSubmit(trimmed);
    } finally {
      isSubmitting = false;
    }
  }

  function submitOnEnter() {
    if (!isEnterPressedInside) return;
    isEnterPressedInside = false;
    void submit();
  }

  function handleKeydownCapture(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.isComposing) {
      isEnterPressedInside = true;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onCancel();
  }
</script>

<div
  bind:this={container}
  class="flex-1 min-w-0"
  role="presentation"
  onkeydowncapture={handleKeydownCapture}
  onkeydown={handleKeydown}
>
  <TextInput
    bind:value={name}
    placeholder="Profile name"
    size={Size.sm}
    hasControls={true}
    isShowSaveControl={name.trim() !== ""}
    isShowClearControl={true}
    isPreventKeyboardToolbar={true}
    testId="appearance-profile-name"
    onEnter={submitOnEnter}
    onSave={submit}
    {onCancel}
  />
</div>
