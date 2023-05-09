<script lang="ts">
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { components } from "$lib/tidy/layout/componentMap";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import YMenuSection from "./YMenuSection.svelte";
  export let currentComponent: ComponentType = components[0];
</script>

{#if currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex flex-col w-full gap-4 mb-40 lg:mb-20">
    {#if currentComponent.heading}
      <Text type={TextType.PAGE_HEADING}>{currentComponent.heading}</Text>
    {/if}
    {#each currentComponent.sections as section}
      <YMenuSection path={currentComponent.path + "/" + section} />
    {/each}
  </div>
{/if}
