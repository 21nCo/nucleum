<script lang="ts">
  import type { Action } from "$lib/tidy/types/action.type";
  import { actions } from "$lib/tidy/layout/actionMap";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import YMenuSection from "./YMenuSection.svelte";
  export let currentComponent: Action = actions[0];
</script>

{#if currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex flex-col w-full gap-4 mb-40 lg:mb-20">
    {#if currentComponent.label}
      <Text style={TextType.PAGE_HEADING}>{currentComponent.label}</Text>
    {/if}
    {#each currentComponent.sections as section}
      <YMenuSection path={currentComponent.path + "/" + section} />
    {/each}
  </div>
{/if}
