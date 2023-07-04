<script lang="ts">
  import { components } from "$lib/tidy/layout/componentMap";
  import YStackElement from "./YStackElement.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { onMount } from "svelte";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  export let currentComponent: ComponentType | undefined = undefined;
  export let params: any = undefined;
  export let path: string | undefined = undefined;
  onMount(() => {
    if (!currentComponent && path)
      currentComponent = getComponentFromPath(path);
  });
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex flex-col gap-10 w-full h-full lg:mb-20 overflow-auto">
    {#if currentComponent.heading && (!params || (params && params.hidePageHeading !== true))}
      <Text type={TextType.PAGE_HEADING}>{currentComponent.heading}</Text>
    {/if}
    {#each currentComponent.sections as section}
      <YStackElement path={currentComponent.path + "/" + section} {params} />
    {/each}
  </div>
{/if}
