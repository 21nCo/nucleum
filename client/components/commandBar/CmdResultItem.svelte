<script lang="ts">
  import { ActionType } from "@21n/types/action.type";
  import { generateCmdType } from "@21n/utils/utils";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import type { ICommandAction } from "@21n/components/commandBar/cmd.type";
  import ResultItem from "@21n/components/commandBar/ResultItem.svelte";
  export let search: string = "";
  export let action: ICommandAction;
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
      Go to{#if search}&nbsp;{/if}
    {/if}
    <!-- {@html label} -->
    {@html renderMdAsHtml(label, {
      isIncludeSpaces: true
    })}
  </div>
  <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
    {generateCmdType(action?.type)}
  </div>
</ResultItem>
