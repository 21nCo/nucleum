<script lang="ts">
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { ContentType, type Action } from "$lib/tidy/types/action.type";
  import YMenuSectionItem from "./YMenuSectionItem.svelte";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";

  export let path: string;
  const classList = "w-full text-start px-8 py-4 rounded-md";
  let currentComponent: Action | null = resolveComponentFromPath(path);
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  <div class="text-fgs2 text-b2">{currentComponent.label?.toUpperCase()}</div>
  <div class="flex flex-col text-start gap-1 w-full">
    {#each currentComponent.sections as section}
      <YMenuSectionItem path={path + "/" + section} />
    {/each}
  </div>
{:else if currentComponent && currentComponent.contentType === ContentType.INLINE}
  <div class="flex justify-center">
    <ComponentResolver action={currentComponent} />
  </div>
{:else}
  <button class={classList} on:click={() => windowObject.gotoPath(path)}>
    {currentComponent?.label}</button
  >
{/if}
