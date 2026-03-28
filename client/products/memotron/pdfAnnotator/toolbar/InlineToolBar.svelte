<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { AnnotationType } from "@21n/products/memotron/pdfAnnotator/pdfAnnotator.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { resolveAnnotationModes } from "@21n/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import HighlightColors from "@21n/products/memotron/common/highlighters/HighlightColors.svelte";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  export let selectedColor = "";
  $: void selectedColor;
  export let style = "";
  let dispatchEvent = createEventDispatcher();
  function propagate(annotation: AnnotationType) {
    dispatchEvent("annotate", annotation);
  }
  function onAnnotateClick(value: IToggleItem["value"]) {
    propagate(value as AnnotationType);
  }
  const annotationModes: IToggleItem[] = resolveAnnotationModes();
</script>

<div
  class="flex gap-2 text-lg min-h-fit px-3 py-1 material-symbols-rounded bg-bgs2 rounded-md border border-brs3"
  {style}
  role="toolbar"
  tabindex="0"
  on:mousedown|stopPropagation
>
  <div class="flex gap-1">
    {#each annotationModes as mode}
      <Button
        icon={mode.icon}
        parentBgIndex={2}
        on:click={() => onAnnotateClick(mode.value)}
      />
    {/each}
  </div>
  <!-- <Divider orientation={Orientation.Vertical} />
  <HighlightColors bind:selected={selectedColor} on:color /> -->
</div>
