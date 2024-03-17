<script lang="ts">
  import { generateUID, performApiCall } from "$lib/tidy/utils/utils";
  import NodeLoadingPulse from "$lib/memotronlib/components/node/NodeLoadingPulse.svelte";
  import Markdown from "$lib/tidy/components/markdown/Markdown.svelte";
  import type { Node } from "$lib/tidy/types/node.type";
  export let spaceId: string;
  export let documentId: string;
  export let mdId = generateUID();
  let document: Node;
  let isLoading: boolean = true;
  $: if (spaceId && documentId) {
    fetchDoc();
  }
  async function fetchDoc() {
    const response = await performApiCall("space/n/doc", "POST", {
      documentId,
      spaceId
    });
    if (response?.ok) {
      const result = await response.json();
      document = result.result;
    }
    isLoading = false;
  }
</script>

{#if !isLoading && document}
  <!-- TODO -->
  <Markdown
    id={mdId}
    md={document.body}
    params={{
      isNodular: false,
      isReadOnly: true,
      actions: ["cop--y", "cop--yRaw"]
    }}
  />
{:else}
  <div class="w-full h-full pl-12 pt-4">
    <NodeLoadingPulse />
  </div>
{/if}
