<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import type { IActiveNodeStore } from "../node.store";

  export let node: IActiveNodeStore;
  function onChange(e: any) {
    if ($node.notes) node.debouncedModify({ notes: $node.notes });
  }
</script>

<div class="h-full w-full">
  <InlineMarkdownTextInput
    placeholder="Add notes"
    bind:content={$node.notes}
    on:change={onChange}
  />
</div>
