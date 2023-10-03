<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { retrieveCurrentColors } from "$lib/tidy/utils/utils";

  export let items: string[];
  export let selectedIndex: number | undefined = undefined;
  export let activeColor: string | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  $: currentColors = retrieveCurrentColors($userPreferences);
  $: defaultActiveColor = currentColors?.accent1;
</script>

{#each items as item, index}
  <div>
    {item}
    {#if selectionStyle === SelectionItemActiveStyle.BOTTOMDOT && selectedIndex === index}
      <div
        class="absolute opacity-80 w-4 rounded-lg"
        style="height: 5%; left: 40%; background-color: {activeColor ??
          defaultActiveColor}"
      />
    {:else if selectionStyle === SelectionItemActiveStyle.BOTTOMBAR}
      {#if selectedIndex === index}
        <div
          class="absolute opacity-80 w-full rounded-lg left-0 bottom-0"
          style="height: 5%; background-color: {activeColor ??
            defaultActiveColor}"
        />
      {:else}
        <div
          class="absolute opacity-80 w-full bg-bgs3 left-0 bottom-0"
          style="height: 5%;"
        />
      {/if}
    {/if}
  </div>
{/each}
