<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { focusById } from "$lib/client/actions/focusById.action";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

  export let node: IActiveNodeStore;
  const inputId = generateSimpleRandomId();
  function onChange(e: any) {
    if ($node.notes) node.modify({ notes: $node.notes });
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
      bind:content={$node.notes}
      on:debouncedChange={onChange}
    />
  </button>
</div>
