<script lang="ts">
  import { page } from "$app/stores";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { createEventDispatcher } from "svelte";
  import { resolveActiveCollectionStore } from "../curation.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  const dispatch = createEventDispatcher();
  export let id: string;
  $: collection = resolveActiveCollectionStore(id);
  $: bilinksRenderedAlongWithNode = $page.url.searchParams.get("blr");
  let buttonProps = {
    style: ButtonStyle.DEFAULT
  };
</script>

<div class="w-full flex justify-between items-center sticky top-0">
  {#if $collection.type === CurationType.NODELINKS}
    {#if bilinksRenderedAlongWithNode}
      <span class="text-h4">Links</span>
    {:else}
      <div class="flex flex-col items-start gap-1">
        <button
          class="text-base text-aps1"
          on:click={() => {
            dispatch("back");
          }}>{$collection.label}</button
        >
        <span>Links</span>
      </div>
    {/if}
  {:else}
    <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
    <!-- TODO - back button to previous resource - if launched from a mention or links -->
    <span class="font-bold text-h1">
      {$collection.label}
    </span>
  {/if}
  <span class="flex gap-4">
    <EditModeToggle />
    <Button icon="search" tooltip="search" {...buttonProps} />
    <Button icon="bird" tooltip="bird view" {...buttonProps} />
    <Button icon="rectangle-stack" tooltip="flashcards" {...buttonProps} />
    <Button icon="share" tooltip="share" {...buttonProps} />
    <Button icon="ellipsis-vertical" {...buttonProps} />
  </span>
</div>
