<script lang="ts">
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { focusById } from "@21n/actions/focusById.action";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";

  let { node }: { node: IActiveNodeStore } = $props();
  let notesContent = $state($node.notes ?? "");
  const inputId = generateSimpleRandomId();

  $effect(() => {
    const nextNotes = $node.notes ?? "";
    if (nextNotes !== notesContent) {
      notesContent = nextNotes;
    }
  });

  function onChange(event: CustomEvent<string | undefined>) {
    notesContent = event.detail ?? "";
    node.modify({ notes: notesContent });
  }
</script>

<div class="h-full w-full flex items-center justify-center overflow-y-auto">
  <button
    class="bg-bgs2 rounded-md p-2 w-full h-full flex overflow-y-auto"
    use:focusById={inputId}
  >
    <InlineMarkdownTextInput
      id={inputId}
      placeholder="Add notes"
      bind:content={notesContent}
      onChange={onChange}
      onDebouncedChange={onChange}
    />
  </button>
</div>
