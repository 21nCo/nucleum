<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { AnnotationType } from "@21n/products/memotron/pdfAnnotator/pdfAnnotator.type";
  import ToggleGroup from "@21n/elements/toggle/ToggleGroup.svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { resolveAnnotationModes } from "@21n/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import HighlightColors from "@21n/products/memotron/common/highlighters/HighlightColors.svelte";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import context from "@21n/stores/context.store";
  import { Embed, OperatingSystem } from "@21n/types/context.type";
  export let selectedColor = "";
  export let style = "";
  export let pageNumber = 1;
  export let totalPages = 1;
  export let selectedAnnotationMode: AnnotationType;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let isSearchActive = false;
  $: isExpanded =
    accessPoint === ResourceAccessPoint.SELF &&
    $context.embed !== Embed.HANDSET &&
    $context.os !== OperatingSystem.IOS;
  let dispatchEvent = createEventDispatcher();
  const annotationModes: IToggleItem[] = resolveAnnotationModes();
  let pageInput = "";
  let isEditingPage = false;

  $: if (!isEditingPage) {
    pageInput = `${pageNumber}`;
  }

  function commitPageInput() {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      pageInput = `${pageNumber}`;
      return;
    }
    const limited = Math.min(Math.max(parsed, 1), totalPages || 1);
    dispatchEvent("goToPage", { page: limited });
  }
</script>

<div
  class="flex min-w-fit min-h-fit h-12 justify-between items-center bg-bgs2 rounded-md border border-brs3 shadow-sm"
  {style}
>
  {#if isExpanded}
    <ToggleGroup
      items={annotationModes}
      size={Size.lg}
      parentBgIndex={2}
      on:change={(e) => {
        selectedAnnotationMode = e.detail;
      }}
      on:none={() => {
        selectedAnnotationMode = AnnotationType.NONE;
      }}
    />
    <Toggle
      icon="search"
      tooltip="Search"
      parentBgIndex={2}
      on={isSearchActive}
      on:change={() => {
        dispatchEvent("searchToggle", !isSearchActive);
      }}
    />
    <span class="px-1" />
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
  {/if}
  <div class="flex justify-center items-center gap-2 px-4">
    <Button
      icon="magnifying-glass-plus"
      parentBgIndex={2}
      on:click={() => {
        dispatchEvent("pageRerender", "ZOOMIN");
      }}
    />
    <div
      class="flex items-center gap-2 min-w-fit text-fgs1 text-b2 pt-1 font-sans"
    >
      <div class="w-12">
        <TextInput
          bind:value={pageInput}
          type="number"
          style={InputStyle.PLAIN}
          size={Size.sm}
          parentBackgroundIndex={2}
          numberInputParams={{ min: 1, max: totalPages, step: 1 }}
          on:focus={() => {
            isEditingPage = true;
          }}
          on:blur={() => {
            commitPageInput();
            isEditingPage = false;
          }}
          on:enter={() => {
            commitPageInput();
            isEditingPage = false;
          }}
        />
      </div>
      <span>/ {totalPages}</span>
    </div>
    <Button
      icon="magnifying-glass-minus"
      parentBgIndex={2}
      on:click={() => {
        dispatchEvent("pageRerender", "ZOOMOUT");
      }}
    />
  </div>
  {#if isExpanded}
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
    <span class="flex items-center px-2">
      <HighlightColors bind:selected={selectedColor} on:color />
    </span>
  {/if}
</div>
