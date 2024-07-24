<script lang="ts">
  import { page } from "$app/stores";
  import { CurationType } from "$lib/client/products/memotron/curation/curation.type";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IActiveCollectionStore } from "./collection.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resolveCollectionContextMenu } from "./collection.store";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  const dispatch = createEventDispatcher();
  export let collection: IActiveCollectionStore;
  $: bilinksRenderedAlongWithNode = $page.url.searchParams.get("blr");
  let contextMenu = [];
  $: contextMenu = resolveCollectionContextMenu(
    $collection,
    ResourceAccessPoint.SELF
  );
  let buttonProps = {
    style: ButtonStyle.DEFAULT
  };
  function onLabelChange(e: any) {
    console.log("collection - onLabelChange", e);
    if ($collection.label)
      collection.debouncedModify({ label: $collection.label });
  }
</script>

<div class="w-full flex justify-between items-center sticky top-0">
  <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
  <!-- TODO - back button to previous resource - if launched from a mention or links -->
  <span class="font-bold text-h1 whitespace-nowrap min-w-fit">
    {#if $isInEditMode}
      <TextInput
        size={Size.xl}
        bind:value={$collection.label}
        style={InputStyle.PLAIN}
        placeholder="Node title"
        width="w-full"
        on:input={onLabelChange}
      />
    {:else}
      {$collection.label}
    {/if}
  </span>

  <span class="flex gap-4">
    {#if $collection.isViewDataRefreshing}
      <div>
        <Icon icon="sync" size={Size.sm} />
      </div>
    {/if}
    <EditModeToggle />
    <Button icon="search" tooltip="search" {...buttonProps} />
    <Button icon="bird" tooltip="bird view" {...buttonProps} />
    <Button icon="rectangle-stack" tooltip="flashcards" {...buttonProps} />
    <Button icon="share" tooltip="share" {...buttonProps} />
    <!-- <Button icon="ellipsis-vertical" {...buttonProps} /> -->
    <ContextMenuAction {contextMenu} />
  </span>
</div>
