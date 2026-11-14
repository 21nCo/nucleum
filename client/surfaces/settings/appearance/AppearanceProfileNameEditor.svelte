<script lang="ts">
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    initialName = "",
    onSubmit,
    onCancel
  }: {
    initialName?: string;
    onSubmit: (name: string) => void;
    onCancel: () => void;
  } = $props();

  let name = $state(initialName);
  let container = $state<HTMLDivElement | undefined>();

  $effect(() => {
    const input = container?.querySelector("input");
    input?.focus();
    input?.select();
  });

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
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
    onEnter={submit}
    onSave={submit}
    {onCancel}
  />
</div>
