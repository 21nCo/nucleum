<script lang="ts">
  import type { NodeType } from "$lib/client/products/memotron/node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { MdStoreType } from "../markdown.store";
  import TextContent from "./TextContent.svelte";
  export let id: IRecordId;
  export let text: string = "";
  export let contentType: NodeType;
  export let mdStore: MdStoreType;
  export let isFocusing: boolean = false;
</script>

<TextContent bind:text bind:isFocusing on:update {id} {contentType} {mdStore} />
