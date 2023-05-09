<script lang="ts">
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import { goto } from "$app/navigation";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import Element from "$lib/tidy/elements/Element.svelte";
  import YMenuSectionItem from "./YMenuSectionItem.svelte";

  export let path: string;
  const classList = "w-full text-start px-8 py-4 rounded-md";
  let currentComponent: ComponentType | undefined = getComponentFromPath(path);
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  <div class="text-fgs2 text-b2">{currentComponent.heading?.toUpperCase()}</div>
  <div class="flex flex-col text-start gap-1 w-full">
    {#each currentComponent.sections as section}
      <YMenuSectionItem path={path + "/" + section} />
    {/each}
  </div>
{:else}
  <Element {classList} on:click={() => goto(path)}>
    {currentComponent?.heading}</Element
  >
{/if}
