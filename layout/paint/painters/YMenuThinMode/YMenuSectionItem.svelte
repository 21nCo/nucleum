<script lang="ts">
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import {
    ContentType,
    type Action,
    ThinModeBehavior
  } from "$lib/tidy/types/action.type";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import view from "$lib/tidy/stores/view.store";
  export let path: string;
  const classList = "w-full text-start px-8 py-2 self-start";
  let currentComponent: Action | null = resolveComponentFromPath(path);
</script>

{#if currentComponent && currentComponent.thinModeBehavior != ThinModeBehavior.HIDE}
  {#if currentComponent.contentType === ContentType.INLINE}
    <div class="flex justify-center">
      <ComponentResolver action={currentComponent} />
    </div>
  {:else}
    <button class={classList + " text-b2"} on:click={() => view.gotoPath(path)}>
      {currentComponent.label?.toLowerCase()}</button
    >
  {/if}
{/if}
