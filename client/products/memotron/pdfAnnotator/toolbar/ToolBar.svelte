<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { AnnotationType } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.type";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { resolveAnnotationModes } from "../pdfAnnotator.utils";
  import HighlightColors from "../../common/highlighters/HighlightColors.svelte";
  import type { IToggleItem } from "$lib/client/elements/toggle/toggle.type";
  export let selectedColor = "";
  export let style = "";
  export let pageNumber = 1;
  export let totalPages = 1;
  export let selectedAnnotationMode: AnnotationType;

  let dispatchEvent = createEventDispatcher();
  const annotationModes: IToggleItem[] = resolveAnnotationModes();
</script>

<div
  class="flex min-w-fit min-h-fit h-12 justify-between items-center bg-bgs2 rounded-md border border-brs3 shadow-sm"
  {style}
>
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
  <Divider
    orientation={Orientation.Vertical}
    colorStrength={ColorStrength.Strong}
  />
  <div class="flex justify-center items-center gap-2 px-4">
    <Button
      icon="magnifying-glass-plus"
      parentBgIndex={2}
      on:click={() => {
        dispatchEvent("pageRerender", "ZOOMIN");
      }}
    />
    <span class="text-fgs1 text-b2 pt-1 font-sans min-w-fit"
      >{pageNumber} / {totalPages}</span
    >
    <Button
      icon="magnifying-glass-minus"
      parentBgIndex={2}
      on:click={() => {
        dispatchEvent("pageRerender", "ZOOMOUT");
      }}
    />
  </div>
  <Divider
    orientation={Orientation.Vertical}
    colorStrength={ColorStrength.Strong}
  />
  <span class="flex items-center px-2">
    <HighlightColors bind:selected={selectedColor} on:color />
  </span>
</div>
