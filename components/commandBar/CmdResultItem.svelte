<script lang="ts">
  import { ActionType } from "$lib/tidy/types/action.type";
  import { generateCmdType } from "$lib/tidy/utils/utils";
  import ResultItem from "./ResultItem.svelte";
  export let search: string = "";
  export let action: any;
  export let isActive: boolean = false;
  $: label =
    search && action?.cmdLabel?.toLowerCase()?.includes(search.toLowerCase())
      ? action?.cmdLabel.replace(
          new RegExp(search, "gi"),
          (matched: string) => `<span class="font-bold">${matched}</span>`
        )
      : action?.cmdLabel;
</script>

<ResultItem {isActive} on:click>
  <div>
    {#if action.type === ActionType.PAGE}
      Go to
    {/if}
    {@html label}
  </div>
  <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
    {generateCmdType(action?.type)}
  </div>
</ResultItem>
