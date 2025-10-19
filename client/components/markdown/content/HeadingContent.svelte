<script lang="ts">
  import type { NodeType } from "@21n/products/memotron/node/node.type";
  import type { IRecordId } from "@21n/types/data.type";
  import type { MdStoreType } from "@21n/components/markdown/markdown.store";
  import TextContent from "@21n/components/markdown/content/TextContent.svelte";
  export let id: IRecordId;
  export let text: string = "";
  export let contentType: NodeType;
  export let mdStore: MdStoreType;
  export let isFocusing: boolean = false;
</script>

<TextContent bind:text bind:isFocusing on:update {id} {contentType} {mdStore} />
