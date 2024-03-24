<script lang="ts">
  import { generateUID, performApiCall } from "$lib/tidy/utils/utils";
  import NodeLoadingPulse from "$lib/tidy/elements/feedback/animations/NodeLoadingPulse.svelte";
  import Markdown from "$lib/tidy/components/markdown/Markdown.svelte";
  import type { Node } from "$lib/tidy/types/node.type";
  import EmptyStatusView from "$lib/tidy/elements/feedback/EmptyStatusView.svelte";
  export let spaceId: string;
  export let documentId: string;
  export let mdId = generateUID();
  let document: Node;
  let isLoading: boolean = true;
  let isValidDocIdNotPresent: boolean = false;
  // console.log("SpaceDocument", spaceId, documentId);
  $: if (spaceId && documentId) {
    fetchDoc();
  } else {
    isValidDocIdNotPresent = true;
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

{#if isValidDocIdNotPresent}
  <EmptyStatusView
    mainText="Geez! We couldn't find that page."
    subText="Please try again after some time."
  />
{:else if !isLoading && document}
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
