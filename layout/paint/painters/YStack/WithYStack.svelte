<script lang="ts">
  import YStackElement from "./YStackElement.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import type { Action } from "$lib/tidy/types/action.type";
  import { onMount } from "svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  export let currentComponent: Action | null = null;
  export let params: any = undefined;
  export let path: string | undefined = undefined;
  onMount(() => {
    if (!currentComponent && path)
      currentComponent = resolveComponentFromPath(path);
  });
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex flex-col gap-10 w-full h-full lg:mb-20 overflow-auto">
    {#if currentComponent.label && (!params || (params && params.hidePageHeading !== true))}
      <Text style={TextStyle.PAGE_HEADING} content={currentComponent.label} />
    {/if}
    {#each currentComponent.sections as section}
      <YStackElement path={currentComponent.path + "/" + section} {params} />
    {/each}
  </div>
{/if}
