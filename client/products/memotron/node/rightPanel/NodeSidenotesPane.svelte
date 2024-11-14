<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import type { IActiveNodeStore } from "../node.store";

  export let node: IActiveNodeStore;
  let inputRef: InlineMarkdownTextInput;
  function onChange(e: any) {
    if ($node.notes) node.debouncedModify({ notes: $node.notes });
  }
</script>

<div class="h-full w-full flex items-center justify-center">
  <button
    class="bg-bgs2 rounded-md p-2 w-full h-full flex"
    on:click={() => inputRef?.focus()}
  >
    <InlineMarkdownTextInput
      bind:this={inputRef}
      placeholder="Add notes"
      bind:content={$node.notes}
      on:change={onChange}
    />
  </button>
</div>
