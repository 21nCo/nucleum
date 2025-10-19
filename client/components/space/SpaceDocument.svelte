<script lang="ts">
  import { generateUID } from "@21n/utils/utils";
  import NodeLoadingPulse from "@21n/elements/feedback/animations/NodeLoadingPulse.svelte";
  import Markdown from "@21n/components/markdown/Markdown.svelte";
  import NodularMarkdown from "@21n/components/markdown/NodularMarkdown.svelte";
  import type { INode } from "@21n/products/memotron/node/node.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { performApiCall } from "@21n/utils/network.utils";
  import type { IMarkdown } from "@21n/components/markdown/md.type";
  export let params: { spaceId: string; documentId: string };
  export let mdId = generateUID();
  let document: INode;
  let md: IMarkdown;
  let isLoading: boolean = true;
  let isValidDocIdNotPresent: boolean = false;
  // console.log("SpaceDocument", spaceId, documentId);
  $: if (params.spaceId && params.documentId) {
    fetchDoc();
  } else {
    isValidDocIdNotPresent = true;
  }
  async function fetchDoc() {
    const response = await performApiCall("space/n/doc", "POST", {
      ...params
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
{:else if !isLoading && document && "body" in document && document.body}
  <Markdown
    id={mdId}
    md={document.body}
    params={{
      isNodular: false,
      isReadOnly: true,
      actions: ["cop--y", "cop--yRaw"]
    }}
  />
{:else if !isLoading && document && "children" in document}
  <div class="h-full overflow-auto">
    <NodularMarkdown
      {mdId}
      node={document}
      {md}
      params={{ isReadOnly: true }}
    />
  </div>
{:else}
  <div class="w-full h-full pl-12 pt-4">
    <NodeLoadingPulse />
  </div>
{/if}
