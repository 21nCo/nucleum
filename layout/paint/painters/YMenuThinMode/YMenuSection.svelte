<script lang="ts">
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import { goto } from "$app/navigation";
  import {
    BlockType,
    type ComponentType,
  } from "$lib/tidy/types/component.type";
  import Element from "$lib/tidy/elements/Element.svelte";
  import YMenuSectionItem from "./YMenuSectionItem.svelte";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";

  export let path: string;
  const classList = "w-full text-start px-8 py-4 rounded-md";
  let currentComponent: ComponentType | undefined = getComponentFromPath(path);
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  <div class="text-fgs2 text-b2">{currentComponent.label?.toUpperCase()}</div>
  <div class="flex flex-col text-start gap-1 w-full">
    {#each currentComponent.sections as section}
      <YMenuSectionItem path={path + "/" + section} />
    {/each}
  </div>
{:else if currentComponent && currentComponent.type === BlockType.INLINE}
  <div class="flex justify-center">
    <ComponentResolver {currentComponent} />
  </div>
{:else}
  <Element {classList} on:click={() => windowObject.gotoPath(path)}>
    {currentComponent?.label}</Element
  >
{/if}
