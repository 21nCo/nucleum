<script lang="ts">
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import { goto } from "$app/navigation";
  import {
    BlockType,
    type ComponentType,
    ThinModeBehavior,
  } from "$lib/tidy/types/component.type";
  import Element from "$lib/tidy/elements/Element.svelte";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { onMount } from "svelte";
  export let path: string;
  const classList = "w-full text-start px-8 py-2 self-start";
  let currentComponent: ComponentType | undefined = getComponentFromPath(path);
  onMount(() => {
    console.log("currentComponent", currentComponent);
  });
</script>

{#if currentComponent && currentComponent.thinModeBehavior != ThinModeBehavior.HIDE}
  {#if currentComponent.type === BlockType.INLINE}
    <div class="flex justify-center">
      <ComponentResolver {currentComponent} />
    </div>
  {:else}
    <Element classList={classList + " text-b2"} on:click={() => goto(path)}>
      {currentComponent.heading?.toLowerCase()}</Element
    >
  {/if}
{/if}
