<script lang="ts">
  import { ActionType } from "$lib/client/types/action.type";
  import { generateCmdType } from "$lib/client/utils/utils";
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  import ResultItem from "./ResultItem.svelte";
  export let search: string = "";
  export let action: any;
  export let isActive: boolean = false;
  export let index: number;

  $: label =
    search && action?.cmdLabel?.toLowerCase()?.includes(search.toLowerCase())
      ? action?.cmdLabel
          // .replace(
          //   new RegExp(` ${search}`, "gi"),
          //   (matched: string) => `&nbsp;${matched}`
          // )
          // .replace(
          //   new RegExp(`${search} `, "gi"),
          //   (matched: string) => `${matched}&nbsp;`
          // )
          .replace(
            new RegExp(search, "gi"),
            (matched: string) => `**${matched}**`
          )
      : action?.cmdLabel;
</script>

<ResultItem {isActive} {index} on:click>
  <div class="flex min-w-0 flex-1">
    {#if action.type === ActionType.PAGE}
      Go to&nbsp;
    {/if}
    <!-- {@html label} -->
    {@html renderMdAsHtml(label)}
  </div>
  <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
    {generateCmdType(action?.type)}
  </div>
</ResultItem>
