<script lang="ts">
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import {
    BlockType,
    type Action,
    ThinModeBehavior,
  } from "$lib/tidy/types/action.type";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  export let path: string;
  const classList = "w-full text-start px-8 py-2 self-start";
  let currentComponent: Action | null = resolveComponentFromPath(path);
</script>

{#if currentComponent && currentComponent.thinModeBehavior != ThinModeBehavior.HIDE}
  {#if currentComponent.type === BlockType.INLINE}
    <div class="flex justify-center">
      <ComponentResolver {currentComponent} />
    </div>
  {:else}
    <button
      class={classList + " text-b2"}
      on:click={() => windowObject.gotoPath(path)}
    >
      {currentComponent.label?.toLowerCase()}</button
    >
  {/if}
{/if}
