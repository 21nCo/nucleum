<script lang="ts">
  import type { Action } from "$lib/tidy/types/action.type";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import YMenuSection from "./YMenuSection.svelte";
  import actions from "$lib/tidy/stores/actions.store";

  export let currentComponent: Action = $actions[0];
</script>

{#if currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex flex-col w-full gap-4 mb-40 lg:mb-20">
    {#if currentComponent.label}
      <Text style={TextStyle.PAGE_HEADING} content={currentComponent.label} />
    {/if}
    {#each currentComponent.sections as section}
      <YMenuSection path={currentComponent.path + "/" + section} />
    {/each}
  </div>
{/if}
