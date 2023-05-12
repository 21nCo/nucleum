<script lang="ts">
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import { components } from "$lib/tidy/layout/componentMap";
  export let currentComponent: ComponentType = components[0];
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
</script>

{#if currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex justify-center w-full items-center overflow-auto">
    <div class="flex h-full w-full">
      <div
        class="relative w-2/5 max-w-xl flex flex-col items-center gap-4 rounded-xl m-2 {$userPreferences.theme ==
        'Colorful'
          ? 'glasspanel'
          : 'bg-bgs2'}"
        style="padding-top: {pad / 4}px; padding-bottom: {pad /
          4}px; padding-right: {pad / 8}px; padding-left: {pad /
          8}px; height: calc(100% - 1rem);"
      >
        <div class="overflow-auto h-full w-full">
          <ComponentResolver path={currentComponent.sections[0]} />
        </div>
      </div>
      <div
        class="flex justify-center items-center p-4 gap-8 w-3/5"
        style="padding-top: {pad}px; padding-bottom: {pad}px;"
      >
        {#each currentComponent.sections as section, index}
          {#if index > 0}
            <ComponentResolver path={section} />
          {/if}
        {/each}
      </div>
    </div>
  </div>
{:else}
  <ComponentResolver {currentComponent} />
{/if}
