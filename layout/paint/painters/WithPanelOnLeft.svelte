<script lang="ts">
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import type { Action } from "$lib/tidy/types/action.type";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import { actions } from "$lib/tidy/layout/actionMap";
  export let currentComponent: Action = actions[0];
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
</script>

{#if currentComponent.sections && currentComponent.sections.length > 0}
  <div class="flex justify-center h-full w-full items-center">
    <div
      class="relative w-2/5 max-w-xl flex flex-col items-center gap-4 rounded-xl m-2 {$userPreferences.theme ==
      'Colorful'
        ? 'glasspanel'
        : 'bg-bgs2'}"
      style="padding-top: {pad / 4}px; padding-bottom: {pad /
        4}px; padding-right: {pad / 8}px; padding-left: {pad /
        8}px; height: calc(100% - 1rem);"
    >
      <!-- todo - add overflow accordingly - removed overflow-auto as it is cropping info texts -->
      <ComponentResolver
        path={currentComponent.path + "/" + currentComponent.sections[0]}
      />
    </div>
    <!-- todo - removed extra padding -> add locally -->
    <div class="flex justify-center items-center p-4 gap-8 w-3/5 h-full">
      {#each currentComponent.sections as section, index}
        {#if index > 0}
          <ComponentResolver path={currentComponent.path + "/" + section} />
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <ComponentResolver action={currentComponent} />
{/if}
